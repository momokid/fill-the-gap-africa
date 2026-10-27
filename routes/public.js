'use strict';

const express = require('express');
const db = require('../lib/db');
const h = require('../lib/helpers');
const mail = require('../lib/mail');
const config = require('../config');

const router = express.Router();

/* Very small in-memory throttle for the public contact form. */
const contactAttempts = new Map();
const CONTACT_WINDOW = 10 * 60 * 1000;
const CONTACT_MAX = 5;

function contactThrottled(ip) {
  const entry = contactAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > CONTACT_WINDOW) {
    contactAttempts.delete(ip);
    return false;
  }
  return entry.count >= CONTACT_MAX;
}

function recordContact(ip) {
  const entry = contactAttempts.get(ip);
  if (!entry || Date.now() - entry.first > CONTACT_WINDOW) {
    contactAttempts.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

function getPage(slug) {
  return db.get("SELECT * FROM pages WHERE slug = ? AND status = 'published'", [slug]);
}

function publishedPrograms(limit) {
  const sql = `SELECT * FROM programs WHERE status = 'published' ORDER BY sort_order ASC, id ASC${limit ? ' LIMIT ?' : ''}`;
  return limit ? db.all(sql, [limit]) : db.all(sql);
}

function latestPosts(limit, excludeId) {
  const params = [];
  let sql = "SELECT * FROM posts WHERE type = 'post' AND status = 'published'";
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' ORDER BY COALESCE(published_at, created_at) DESC LIMIT ?';
  params.push(limit);
  return db.all(sql, params);
}

function team(limit) {
  const sql = `SELECT * FROM team WHERE status = 'published' ORDER BY sort_order ASC, id ASC${limit ? ' LIMIT ?' : ''}`;
  return limit ? db.all(sql, [limit]) : db.all(sql);
}

function upcomingEvents(limit) {
  return db.all(
    `SELECT * FROM posts WHERE type = 'event' AND status = 'published' AND datetime(event_start) >= datetime('now')
     ORDER BY event_start ASC LIMIT ?`,
    [limit]
  );
}

function setMeta(res, title, description, image) {
  res.locals.meta = {
    title: title || res.locals.site.site_name,
    description: description || res.locals.site.site_description,
    image: image || ''
  };
}

/* -------------------------------------------------------------------------- */
/* Home                                                                        */
/* -------------------------------------------------------------------------- */
router.get('/', (req, res) => {
  const programs = publishedPrograms(4);
  const members = team(4);
  const posts = latestPosts(3);
  const events = upcomingEvents(2);
  const stats = [1, 2, 3, 4].map((n) => ({
    value: res.locals.site[`stat_${n}_value`],
    label: res.locals.site[`stat_${n}_label`]
  }));

  setMeta(res, `${res.locals.site.site_name} | ${res.locals.site.site_tagline}`, res.locals.site.site_description);

  res.render('home', {
    title: res.locals.site.site_name,
    programs,
    members,
    posts,
    events,
    stats
  });
});

/* -------------------------------------------------------------------------- */
/* About                                                                       */
/* -------------------------------------------------------------------------- */
router.get('/about', (req, res) => {
  const page = getPage('about') || {};
  setMeta(res, `${page.title || 'About'} | ${res.locals.site.site_name}`, page.hero_lede);
  res.render('about', { title: page.title || 'About', page, members: team(4) });
});

/* -------------------------------------------------------------------------- */
/* Programs                                                                    */
/* -------------------------------------------------------------------------- */
router.get('/programs', (req, res) => {
  const page = getPage('programs') || {};
  setMeta(res, `${page.title || 'Programs'} | ${res.locals.site.site_name}`, page.hero_lede);
  res.render('programs', { title: page.title || 'Programs', page, programs: publishedPrograms() });
});

router.get('/programs/:slug', (req, res, next) => {
  const program = db.get("SELECT * FROM programs WHERE slug = ? AND status = 'published'", [req.params.slug]);
  if (!program) return next();

  const others = db.all(
    "SELECT title, slug, summary FROM programs WHERE status = 'published' AND id != ? ORDER BY sort_order ASC LIMIT 3",
    [program.id]
  );

  setMeta(res, `${program.title} | ${res.locals.site.site_name}`, program.summary, program.cover);
  return res.render('program', { title: program.title, program, others });
});

/* -------------------------------------------------------------------------- */
/* Impact                                                                      */
/* -------------------------------------------------------------------------- */
router.get('/impact', (req, res) => {
  const page = getPage('impact') || {};
  const stats = [1, 2, 3, 4].map((n) => ({
    value: res.locals.site[`stat_${n}_value`],
    label: res.locals.site[`stat_${n}_label`]
  }));

  setMeta(res, `${page.title || 'Impact'} | ${res.locals.site.site_name}`, page.hero_lede);
  res.render('impact', { title: page.title || 'Impact', page, stats });
});

/* -------------------------------------------------------------------------- */
/* Get involved                                                                */
/* -------------------------------------------------------------------------- */
router.get('/get-involved', (req, res) => {
  const page = getPage('get-involved') || {};
  setMeta(res, `${page.title || 'Get involved'} | ${res.locals.site.site_name}`, page.hero_lede);
  res.render('get-involved', { title: page.title || 'Get involved', page });
});

/* -------------------------------------------------------------------------- */
/* Donate                                                                      */
/* -------------------------------------------------------------------------- */
router.get('/donate', (req, res) => {
  const page = getPage('donate') || {};
  setMeta(res, `Donate | ${res.locals.site.site_name}`, page.hero_lede);
  res.render('donate', { title: page.title || 'Donate', page });
});

/* -------------------------------------------------------------------------- */
/* Contact                                                                     */
/* -------------------------------------------------------------------------- */
router.get('/contact', (req, res) => {
  const page = getPage('contact') || {};
  setMeta(res, `Contact | ${res.locals.site.site_name}`, page.hero_lede);
  res.render('contact', {
    title: page.title || 'Contact',
    page,
    sent: req.query.sent === '1',
    errors: [],
    old: {}
  });
});

router.post('/contact', (req, res) => {
  const page = getPage('contact') || {};
  const old = {
    name: h.cleanText(req.body.name, 120),
    email: h.cleanText(req.body.email, 160),
    phone: h.cleanText(req.body.phone, 40),
    topic: h.cleanText(req.body.topic, 60) || 'General enquiry',
    message: String(req.body.message || '').trim().slice(0, 4000)
  };

  const errors = [];

  if (h.cleanText(req.body.website, 50)) {
    // Honeypot: pretend success, store nothing.
    return res.redirect('/contact?sent=1');
  }

  if (contactThrottled(req.ip)) {
    errors.push('Too many messages from this connection. Please wait a few minutes and try again.');
  }

  if (!old.name) errors.push('Please add your name.');
  if (!h.isEmail(old.email)) errors.push('Please add a valid email address.');
  if (old.message.length < 10) errors.push('Please write a slightly longer message.');

  if (errors.length) {
    setMeta(res, 'Contact | ' + res.locals.site.site_name, page.hero_lede);
    return res.status(422).render('contact', {
      title: 'Contact',
      page,
      sent: false,
      errors,
      old
    });
  }

  recordContact(req.ip);

  const id = db.insert(
    `INSERT INTO messages (name, email, phone, topic, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [old.name, old.email, old.phone, old.topic, old.message, db.nowIso()]
  );

  const message = { id, ...old };

  Promise.resolve()
    .then(() => mail.notifyEnquiry(message, res.locals.site))
    .then(() => mail.acknowledge(message, res.locals.site))
    .catch((error) => console.error('[contact] mail error', error.message));

  return res.redirect('/contact?sent=1#contact-form');
});

/* -------------------------------------------------------------------------- */
/* Stories                                                                     */
/* -------------------------------------------------------------------------- */
const STORIES_PER_PAGE = 6;

router.get('/stories', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * STORIES_PER_PAGE;

  const total = db.get("SELECT COUNT(*) AS n FROM posts WHERE type = 'post' AND status = 'published'").n;
  const posts = db.all(
    `SELECT * FROM posts WHERE type = 'post' AND status = 'published'
     ORDER BY COALESCE(published_at, created_at) DESC LIMIT ? OFFSET ?`,
    [STORIES_PER_PAGE, offset]
  );

  setMeta(res, `Stories | ${res.locals.site.site_name}`, 'Field notes, updates and lessons from the communities we work with.');

  res.render('stories', {
    title: 'Stories',
    posts,
    page,
    totalPages: Math.max(1, Math.ceil(total / STORIES_PER_PAGE))
  });
});

router.get('/stories/:slug', (req, res, next) => {
  const post = db.get("SELECT * FROM posts WHERE slug = ? AND type = 'post' AND status = 'published'", [req.params.slug]);
  if (!post) return next();

  const related = db.all(
    `SELECT * FROM posts WHERE type = 'post' AND status = 'published' AND id != ?
     ORDER BY COALESCE(published_at, created_at) DESC LIMIT 3`,
    [post.id]
  );

  setMeta(res, `${post.title} | ${res.locals.site.site_name}`, post.excerpt, post.cover);
  return res.render('story', { title: post.title, post, related });
});

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */
router.get('/events', (req, res) => {
  const upcoming = db.all(
    `SELECT * FROM posts WHERE type = 'event' AND status = 'published' AND datetime(event_start) >= datetime('now')
     ORDER BY event_start ASC`
  );
  const past = db.all(
    `SELECT * FROM posts WHERE type = 'event' AND status = 'published' AND datetime(event_start) < datetime('now')
     ORDER BY event_start DESC`
  );

  setMeta(res, `Events | ${res.locals.site.site_name}`, 'Community screenings, training cohorts and partner events.');
  res.render('events', { title: 'Events', upcoming, past });
});

router.get('/events/:slug', (req, res, next) => {
  const event = db.get("SELECT * FROM posts WHERE slug = ? AND type = 'event' AND status = 'published'", [req.params.slug]);
  if (!event) return next();

  const others = upcomingEvents(3).filter((item) => item.id !== event.id);

  setMeta(res, `${event.title} | ${res.locals.site.site_name}`, event.excerpt, event.cover);
  return res.render('event', { title: event.title, event, others });
});

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */
router.get('/search', (req, res) => {
  const query = h.cleanText(req.query.q, 100);
  let results = { posts: [], programs: [], pages: [] };

  if (query) {
    const like = `%${query}%`;
    results = {
      posts: db.all(
        `SELECT * FROM posts WHERE status = 'published' AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)
         ORDER BY COALESCE(published_at, created_at) DESC LIMIT 20`,
        [like, like, like]
      ),
      programs: db.all(
        "SELECT * FROM programs WHERE status = 'published' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?) LIMIT 10",
        [like, like, like]
      ),
      pages: db.all(
        "SELECT * FROM pages WHERE status = 'published' AND (title LIKE ? OR content LIKE ?) LIMIT 10",
        [like, like]
      )
    };
  }

  setMeta(res, `Search | ${res.locals.site.site_name}`);
  res.render('search', { title: 'Search', query, results });
});

/* -------------------------------------------------------------------------- */
/* Sitemap & robots                                                            */
/* -------------------------------------------------------------------------- */
router.get('/sitemap.xml', (req, res) => {
  const base = config.baseUrl || `${req.protocol}://${req.get('host')}`;
  const staticPaths = ['/', '/about', '/programs', '/impact', '/get-involved', '/donate', '/contact', '/stories', '/events'];
  const pages = db.all("SELECT slug, updated_at FROM pages WHERE status = 'published'");
  const programs = db.all("SELECT slug, updated_at FROM programs WHERE status = 'published'");
  const posts = db.all("SELECT slug, type, updated_at FROM posts WHERE status = 'published'");

  const urls = [
    ...staticPaths.map((p) => ({ loc: base + p, lastmod: null })),
    ...pages.map((p) => ({ loc: `${base}/${p.slug}`, lastmod: p.updated_at })),
    ...programs.map((p) => ({ loc: `${base}/programs/${p.slug}`, lastmod: p.updated_at })),
    ...posts.map((p) => ({
      loc: `${base}${p.type === 'event' ? '/events/' : '/stories/'}${p.slug}`,
      lastmod: p.updated_at
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${String(u.lastmod).slice(0, 10)}</lastmod>` : ''}</url>`
  )
  .join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
});

router.get('/robots.txt', (req, res) => {
  const base = config.baseUrl || `${req.protocol}://${req.get('host')}`;
  const adminPath = res.locals.adminBase || config.adminPath;
  res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: ${adminPath}\n\nSitemap: ${base}/sitemap.xml\n`);
});

/* -------------------------------------------------------------------------- */
/* Generic page (must stay last)                                               */
/* -------------------------------------------------------------------------- */
router.get('/:slug', (req, res, next) => {
  const page = db.get("SELECT * FROM pages WHERE slug = ? AND status = 'published'", [req.params.slug]);
  if (!page) return next();

  setMeta(res, `${page.title} | ${res.locals.site.site_name}`, page.hero_lede);
  return res.render('page', { title: page.title, page });
});

module.exports = router;
