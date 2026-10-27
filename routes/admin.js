'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const db = require('../lib/db');
const h = require('../lib/helpers');
const auth = require('../lib/auth');
const upload = require('../lib/upload');
const config = require('../config');

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function flash(req, type, message) {
  req.session.flash = { type, message };
}

/** Build a studio URL from the request, so a custom admin path always works. */
function adminUrl(req, suffix = '') {
  const base = req.adminBase || config.adminPath;
  return base + suffix;
}

function uniqueSlug(table, desired, id) {
  const base = h.slugify(desired) || 'item';
  let slug = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = id ? [slug, id] : [slug];
    const sql = id ? `SELECT id FROM ${table} WHERE slug = ? AND id != ?` : `SELECT id FROM ${table} WHERE slug = ?`;
    if (!db.get(sql, params)) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function adminView(res, view, locals) {
  res.render(`admin/${view}`, locals);
}

function imagePath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

function recordMedia(file) {
  if (!file) return;
  db.insert(
    'INSERT INTO media (filename, original_name, mime, size, created_at) VALUES (?, ?, ?, ?, ?)',
    [file.filename, file.originalname, file.mimetype, file.size, db.nowIso()]
  );
}

function removeUpload(publicPath) {
  upload.removeFile(publicPath);
  if (publicPath && publicPath.startsWith('/uploads/')) {
    db.run('DELETE FROM media WHERE filename = ?', [path.basename(publicPath)]);
  }
}

/* -------------------------------------------------------------------------- */
/* Authentication                                                              */
/* -------------------------------------------------------------------------- */

router.get('/login', auth.redirectIfAuthed, (req, res) => {
  const base = req.adminBase || '/admin';
  const next = typeof req.query.next === 'string' && req.query.next.startsWith(base) ? req.query.next : base;
  res.render('admin/login', { title: 'Sign in', next, error: null, email: '' });
});

router.post('/login', auth.redirectIfAuthed, (req, res) => {
  const email = h.cleanText(req.body.email, 160);
  const password = String(req.body.password || '');
  const base = req.adminBase || '/admin';
  const next = typeof req.body.next === 'string' && req.body.next.startsWith(base) ? req.body.next : base;
  const ip = req.ip || 'unknown';

  if (auth.throttled(ip)) {
    return res.status(429).render('admin/login', {
      title: 'Sign in',
      next,
      email,
      error: 'Too many attempts. Please wait 15 minutes before trying again.'
    });
  }

  const user = auth.findByEmail(email);

  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    auth.recordFailure(ip);
    return res.status(401).render('admin/login', {
      title: 'Sign in',
      next,
      email,
      error: 'Those details did not match. Check your email and password.'
    });
  }

  auth.clearFailures(ip);
  req.session.userId = user.id;
  return res.redirect(next);
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect(req.adminBase + '/login');
});

/* Everything below requires a signed-in user. */
router.use(auth.requireAuth);

router.use((req, res, next) => {
  res.locals.unreadMessages = db.get('SELECT COUNT(*) AS n FROM messages WHERE is_read = 0').n;
  next();
});

router.use((req, res, next) => {
  const role = req.user.role || 'reader';
  res.locals.canEdit = role === 'admin' || role === 'editor';
  res.locals.canAdmin = role === 'admin';
  next();
});

router.use((req, res, next) => {
  const forbidden = () => res.status(403).render('admin/error', {
    status: 403,
    message: 'Your role does not allow this action. Ask an administrator for access.'
  });

  if (req.path.startsWith('/settings') || req.path.startsWith('/users')) {
    return res.locals.canAdmin ? next() : forbidden();
  }

  if (res.locals.canEdit) return next();

  const readerAllowed = req.path === '/' || req.path.startsWith('/messages') || req.path.startsWith('/profile');
  if (req.method === 'GET' && readerAllowed) return next();
  if (req.method === 'POST' && (req.path === '/profile' || req.path === '/profile/password')) return next();

  return forbidden();
});

router.get('/', (req, res) => {
  const stats = {
    posts: db.get("SELECT COUNT(*) AS n FROM posts WHERE type = 'post' AND status = 'published'").n,
    drafts: db.get("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'").n,
    events: db.get("SELECT COUNT(*) AS n FROM posts WHERE type = 'event' AND status = 'published'").n,
    messages: db.get('SELECT COUNT(*) AS n FROM messages WHERE is_read = 0').n,
    programs: db.get("SELECT COUNT(*) AS n FROM programs WHERE status = 'published'").n,
    pages: db.get("SELECT COUNT(*) AS n FROM pages WHERE status = 'published'").n
  };

  const recentMessages = db.all('SELECT * FROM messages ORDER BY created_at DESC LIMIT 5');
  const recentPosts = db.all('SELECT * FROM posts ORDER BY updated_at DESC LIMIT 5');

  adminView(res, 'dashboard', {
    title: 'Dashboard',
    section: 'dashboard',
    stats,
    recentMessages,
    recentPosts
  });
});

/* -------------------------------------------------------------------------- */
/* Posts & events                                                              */
/* -------------------------------------------------------------------------- */

router.get('/posts', (req, res) => {
  const type = ['post', 'event'].includes(req.query.type) ? req.query.type : 'all';
  const status = ['published', 'draft'].includes(req.query.status) ? req.query.status : 'all';

  let sql = 'SELECT * FROM posts WHERE 1 = 1';
  const params = [];

  if (type !== 'all') {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY COALESCE(event_start, published_at, created_at) DESC';

  adminView(res, 'posts', {
    title: type === 'event' ? 'Events' : 'Posts',
    section: type === 'event' ? 'events' : 'posts',
    posts: db.all(sql, params),
    type,
    status
  });
});

router.get('/posts/new', (req, res) => {
  const type = req.query.type === 'event' ? 'event' : 'post';
  adminView(res, 'post-form', {
    title: type === 'event' ? 'New event' : 'New post',
    section: type === 'event' ? 'events' : 'posts',
    post: { type, status: 'draft', content: '', title: '', excerpt: '', category: '' },
    errors: []
  });
});

router.post('/posts', upload.secure('cover'), (req, res) => {
  const data = readPost(req.body);
  const errors = validatePost(data);

  if (errors.length) {
    if (req.file) removeUpload(imagePath(req.file));
    return res.status(422).render('admin/post-form', {
      title: data.type === 'event' ? 'New event' : 'New post',
      section: data.type === 'event' ? 'events' : 'posts',
      post: { ...data, id: null },
      errors
    });
  }

  const cover = req.file ? imagePath(req.file) : '';
  recordMedia(req.file);

  db.insert(
    `INSERT INTO posts (type, title, slug, excerpt, content, cover, category, status, published_at, event_start, event_end, event_location, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.type,
      data.title,
      uniqueSlug('posts', data.slug || data.title),
      data.excerpt,
      data.content,
      cover,
      data.category,
      data.status,
      data.published_at,
      data.event_start,
      data.event_end,
      data.event_location,
      req.user.id,
      db.nowIso(),
      db.nowIso()
    ]
  );

  flash(req, 'success', 'Saved. The new item is now in your list.');
  res.redirect(adminUrl(req, data.type === 'event' ? '/posts?type=event' : '/posts'));
});

router.get('/posts/:id/edit', (req, res, next) => {
  const post = db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return next();

  adminView(res, 'post-form', {
    title: 'Edit ' + post.title,
    section: post.type === 'event' ? 'events' : 'posts',
    post,
    errors: []
  });
});

router.post('/posts/:id', upload.secure('cover'), (req, res, next) => {
  const existing = db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!existing) return next();

  const data = readPost(req.body);
  const errors = validatePost(data);

  if (errors.length) {
    if (req.file) removeUpload(imagePath(req.file));
    return res.status(422).render('admin/post-form', {
      title: 'Edit ' + existing.title,
      section: data.type === 'event' ? 'events' : 'posts',
      post: { ...existing, ...data },
      errors
    });
  }

  let cover = existing.cover;

  if (req.body.remove_cover === '1' && cover) {
    removeUpload(cover);
    cover = '';
  }

  if (req.file) {
    if (cover) removeUpload(cover);
    cover = imagePath(req.file);
    recordMedia(req.file);
  }

  db.run(
    `UPDATE posts SET type = ?, title = ?, slug = ?, excerpt = ?, content = ?, cover = ?, category = ?,
     status = ?, published_at = ?, event_start = ?, event_end = ?, event_location = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.type,
      data.title,
      uniqueSlug('posts', data.slug || data.title, existing.id),
      data.excerpt,
      data.content,
      cover,
      data.category,
      data.status,
      data.published_at,
      data.event_start,
      data.event_end,
      data.event_location,
      db.nowIso(),
      existing.id
    ]
  );

  flash(req, 'success', 'Changes saved.');
  res.redirect(adminUrl(req, `/posts/${existing.id}/edit`));
});

router.post('/posts/:id/delete', (req, res, next) => {
  const post = db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return next();

  if (post.cover) removeUpload(post.cover);
  db.run('DELETE FROM posts WHERE id = ?', [post.id]);

  flash(req, 'success', 'Deleted.');
  res.redirect(adminUrl(req, post.type === 'event' ? '/posts?type=event' : '/posts'));
});

function readPost(body) {
  const type = body.type === 'event' ? 'event' : 'post';
  const status = body.status === 'published' ? 'published' : 'draft';

  let publishedAt = parseDate(body.published_at);
  if (!publishedAt && status === 'published') publishedAt = db.nowIso();

  return {
    type,
    status,
    title: h.stripDashes(h.cleanText(body.title, 180)),
    slug: h.cleanText(body.slug, 180),
    excerpt: h.stripDashes(h.cleanText(body.excerpt, 400)),
    category: h.stripDashes(h.cleanText(body.category, 60)),
    content: h.stripDashes(h.sanitizeContent(body.content)),
    published_at: publishedAt,
    event_start: type === 'event' ? parseDate(body.event_start) : null,
    event_end: type === 'event' ? parseDate(body.event_end) : null,
    event_location: type === 'event' ? h.cleanText(body.event_location, 180) : ''
  };
}

function validatePost(data) {
  const errors = [];
  if (!data.title) errors.push('A title is required.');
  if (data.type === 'event' && !data.event_start) errors.push('Events need a start date and time.');
  if (data.content && h.stripHtml(data.content).length < 20) errors.push('The content looks too short.');
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Pages                                                                       */
/* -------------------------------------------------------------------------- */

const RESERVED_PAGE_SLUGS = ['about', 'programs', 'impact', 'get-involved', 'donate', 'contact', 'privacy'];

router.get('/pages', (req, res) => {
  adminView(res, 'pages', {
    title: 'Pages',
    section: 'pages',
    pages: db.all('SELECT * FROM pages ORDER BY id ASC')
  });
});

router.get('/pages/new', (req, res) => {
  adminView(res, 'page-form', {
    title: 'New page',
    section: 'pages',
    page: { status: 'published', template: 'default', content: '', title: '', slug: '', hero_title: '', hero_lede: '', hero_eyebrow: '' },
    errors: [],
    templates: pageTemplates()
  });
});

router.post('/pages', (req, res) => {
  const data = readPage(req.body);
  const errors = validatePage(data);

  if (errors.length) {
    return res.status(422).render('admin/page-form', {
      title: 'New page',
      section: 'pages',
      page: { ...data, id: null },
      errors,
      templates: pageTemplates()
    });
  }

  db.insert(
    `INSERT INTO pages (slug, title, template, hero_eyebrow, hero_title, hero_lede, content, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uniqueSlug('pages', data.slug || data.title), data.title, data.template, data.hero_eyebrow, data.hero_title, data.hero_lede, data.content, data.status, db.nowIso(), db.nowIso()]
  );

  flash(req, 'success', 'Page created.');
  res.redirect(req.adminBase + '/pages');
});

router.get('/pages/:id/edit', (req, res, next) => {
  const page = db.get('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  if (!page) return next();

  adminView(res, 'page-form', {
    title: 'Edit ' + page.title,
    section: 'pages',
    page,
    errors: [],
    templates: pageTemplates(),
    reserved: RESERVED_PAGE_SLUGS.includes(page.slug)
  });
});

router.post('/pages/:id', (req, res, next) => {
  const existing = db.get('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  if (!existing) return next();

  const data = readPage(req.body);
  const errors = validatePage(data);

  if (errors.length) {
    return res.status(422).render('admin/page-form', {
      title: 'Edit ' + existing.title,
      section: 'pages',
      page: { ...existing, ...data },
      errors,
      templates: pageTemplates(),
      reserved: RESERVED_PAGE_SLUGS.includes(existing.slug)
    });
  }

  const slug = RESERVED_PAGE_SLUGS.includes(existing.slug)
    ? existing.slug
    : uniqueSlug('pages', data.slug || data.title, existing.id);

  db.run(
    `UPDATE pages SET slug = ?, title = ?, template = ?, hero_eyebrow = ?, hero_title = ?, hero_lede = ?, content = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [slug, data.title, data.template, data.hero_eyebrow, data.hero_title, data.hero_lede, data.content, data.status, db.nowIso(), existing.id]
  );

  flash(req, 'success', 'Page saved.');
  res.redirect(adminUrl(req, `/pages/${existing.id}/edit`));
});

router.post('/pages/:id/delete', (req, res, next) => {
  const page = db.get('SELECT * FROM pages WHERE id = ?', [req.params.id]);
  if (!page) return next();

  if (RESERVED_PAGE_SLUGS.includes(page.slug)) {
    flash(req, 'error', 'This page is part of the site structure and cannot be deleted.');
    return res.redirect(req.adminBase + '/pages');
  }

  db.run('DELETE FROM pages WHERE id = ?', [page.id]);
  flash(req, 'success', 'Page deleted.');
  res.redirect(req.adminBase + '/pages');
});

function pageTemplates() {
  return [
    { value: 'default', label: 'Standard page' },
    { value: 'about', label: 'About (team & values)' },
    { value: 'programs', label: 'Programs overview' },
    { value: 'impact', label: 'Impact' },
    { value: 'get-involved', label: 'Get involved' },
    { value: 'donate', label: 'Donate' },
    { value: 'contact', label: 'Contact' }
  ];
}

function readPage(body) {
  const template = pageTemplates().some((t) => t.value === body.template) ? body.template : 'default';
  return {
    title: h.stripDashes(h.cleanText(body.title, 180)),
    slug: h.cleanText(body.slug, 180),
    template,
    status: body.status === 'draft' ? 'draft' : 'published',
    hero_eyebrow: h.stripDashes(h.cleanText(body.hero_eyebrow, 120)),
    hero_title: h.stripDashes(h.cleanText(body.hero_title, 200)),
    hero_lede: h.stripDashes(h.cleanText(body.hero_lede, 400)),
    content: h.sanitizeContent(body.content)
  };
}

function validatePage(data) {
  const errors = [];
  if (!data.title) errors.push('A title is required.');
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Programs                                                                    */
/* -------------------------------------------------------------------------- */

router.get('/programs', (req, res) => {
  adminView(res, 'programs', {
    title: 'Programs',
    section: 'programs',
    programs: db.all('SELECT * FROM programs ORDER BY sort_order ASC, id ASC')
  });
});

router.get('/programs/new', (req, res) => {
  adminView(res, 'program-form', {
    title: 'New program',
    section: 'programs',
    program: { status: 'published', icon: 'book', summary: '', content: '', title: '', slug: '', sort_order: 0 },
    errors: []
  });
});

router.post('/programs', upload.secure('cover'), (req, res) => {
  const data = readProgram(req.body);
  const errors = data.title ? [] : ['A title is required.'];

  if (errors.length) {
    if (req.file) removeUpload(imagePath(req.file));
    return res.status(422).render('admin/program-form', {
      title: 'New program',
      section: 'programs',
      program: { ...data, id: null },
      errors
    });
  }

  const cover = req.file ? imagePath(req.file) : '';
  recordMedia(req.file);

  db.insert(
    `INSERT INTO programs (title, slug, summary, content, icon, cover, sort_order, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, uniqueSlug('programs', data.slug || data.title), data.summary, data.content, data.icon, cover, data.sort_order, data.status, db.nowIso(), db.nowIso()]
  );

  flash(req, 'success', 'Program created.');
  res.redirect(req.adminBase + '/programs');
});

router.get('/programs/:id/edit', (req, res, next) => {
  const program = db.get('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!program) return next();

  adminView(res, 'program-form', {
    title: 'Edit ' + program.title,
    section: 'programs',
    program,
    errors: []
  });
});

router.post('/programs/:id', upload.secure('cover'), (req, res, next) => {
  const existing = db.get('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!existing) return next();

  const data = readProgram(req.body);
  const errors = data.title ? [] : ['A title is required.'];

  if (errors.length) {
    if (req.file) removeUpload(imagePath(req.file));
    return res.status(422).render('admin/program-form', {
      title: 'Edit ' + existing.title,
      section: 'programs',
      program: { ...existing, ...data },
      errors
    });
  }

  let cover = existing.cover;
  if (req.body.remove_cover === '1' && cover) {
    removeUpload(cover);
    cover = '';
  }
  if (req.file) {
    if (cover) removeUpload(cover);
    cover = imagePath(req.file);
    recordMedia(req.file);
  }

  db.run(
    `UPDATE programs SET title = ?, slug = ?, summary = ?, content = ?, icon = ?, cover = ?, sort_order = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [data.title, uniqueSlug('programs', data.slug || data.title, existing.id), data.summary, data.content, data.icon, cover, data.sort_order, data.status, db.nowIso(), existing.id]
  );

  flash(req, 'success', 'Program saved.');
  res.redirect(adminUrl(req, `/programs/${existing.id}/edit`));
});

router.post('/programs/:id/delete', (req, res, next) => {
  const program = db.get('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!program) return next();

  if (program.cover) removeUpload(program.cover);
  db.run('DELETE FROM programs WHERE id = ?', [program.id]);

  flash(req, 'success', 'Program deleted.');
  res.redirect(req.adminBase + '/programs');
});

function readProgram(body) {
  const icons = ['book', 'briefcase', 'pulse', 'leaf', 'users', 'globe', 'heart', 'shield', 'spark'];
  return {
    title: h.stripDashes(h.cleanText(body.title, 180)),
    slug: h.cleanText(body.slug, 180),
    summary: h.stripDashes(h.cleanText(body.summary, 300)),
    content: h.stripDashes(h.sanitizeContent(body.content)),
    icon: icons.includes(body.icon) ? body.icon : 'book',
    status: body.status === 'draft' ? 'draft' : 'published',
    sort_order: parseInt(body.sort_order, 10) || 0
  };
}

/* -------------------------------------------------------------------------- */
/* Team                                                                        */
/* -------------------------------------------------------------------------- */

router.get('/team', (req, res) => {
  adminView(res, 'team', {
    title: 'Team',
    section: 'team',
    members: db.all('SELECT * FROM team ORDER BY sort_order ASC, id ASC')
  });
});

router.get('/team/new', (req, res) => {
  adminView(res, 'team-form', {
    title: 'New team member',
    section: 'team',
    member: { status: 'published', name: '', role: '', bio: '', initials: '', sort_order: 0 },
    errors: []
  });
});

router.post('/team', upload.secure('photo'), (req, res) => {
  const data = readTeam(req.body);
  const errors = data.name ? [] : ['A name is required.'];

  if (errors.length) {
    if (req.file) removeUpload(imagePath(req.file));
    return res.status(422).render('admin/team-form', {
      title: 'New team member',
      section: 'team',
      member: { ...data, id: null },
      errors
    });
  }

  const photo = req.file ? imagePath(req.file) : '';
  recordMedia(req.file);

  db.insert(
    `INSERT INTO team (name, role, bio, initials, photo, sort_order, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.role, data.bio, data.initials || h.initials(data.name), photo, data.sort_order, data.status, db.nowIso(), db.nowIso()]
  );

  flash(req, 'success', 'Team member added.');
  res.redirect(req.adminBase + '/team');
});

router.get('/team/:id/edit', (req, res, next) => {
  const member = db.get('SELECT * FROM team WHERE id = ?', [req.params.id]);
  if (!member) return next();

  adminView(res, 'team-form', {
    title: 'Edit ' + member.name,
    section: 'team',
    member,
    errors: []
  });
});

router.post('/team/:id', upload.secure('photo'), (req, res, next) => {
  const existing = db.get('SELECT * FROM team WHERE id = ?', [req.params.id]);
  if (!existing) return next();

  const data = readTeam(req.body);
  const errors = data.name ? [] : ['A name is required.'];

  if (errors.length) {
    if (req.file) removeUpload(imagePath(req.file));
    return res.status(422).render('admin/team-form', {
      title: 'Edit ' + existing.name,
      section: 'team',
      member: { ...existing, ...data },
      errors
    });
  }

  let photo = existing.photo;
  if (req.body.remove_photo === '1' && photo) {
    removeUpload(photo);
    photo = '';
  }
  if (req.file) {
    if (photo) removeUpload(photo);
    photo = imagePath(req.file);
    recordMedia(req.file);
  }

  db.run(
    `UPDATE team SET name = ?, role = ?, bio = ?, initials = ?, photo = ?, sort_order = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [data.name, data.role, data.bio, data.initials || h.initials(data.name), photo, data.sort_order, data.status, db.nowIso(), existing.id]
  );

  flash(req, 'success', 'Team member saved.');
  res.redirect(adminUrl(req, `/team/${existing.id}/edit`));
});

router.post('/team/:id/delete', (req, res, next) => {
  const member = db.get('SELECT * FROM team WHERE id = ?', [req.params.id]);
  if (!member) return next();

  if (member.photo) removeUpload(member.photo);
  db.run('DELETE FROM team WHERE id = ?', [member.id]);

  flash(req, 'success', 'Team member removed.');
  res.redirect(req.adminBase + '/team');
});

function readTeam(body) {
  return {
    name: h.stripDashes(h.cleanText(body.name, 160)),
    role: h.stripDashes(h.cleanText(body.role, 160)),
    bio: h.stripDashes(h.cleanText(body.bio, 500)),
    initials: h.cleanText(body.initials, 3).toUpperCase(),
    status: body.status === 'draft' ? 'draft' : 'published',
    sort_order: parseInt(body.sort_order, 10) || 0
  };
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

router.get('/messages', (req, res) => {
  const id = parseInt(req.query.id, 10);
  const selected = id ? db.get('SELECT * FROM messages WHERE id = ?', [id]) : null;

  if (selected) {
    db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [selected.id]);
    selected.is_read = 1;
  }

  adminView(res, 'messages', {
    title: 'Messages',
    section: 'messages',
    messages: db.all('SELECT * FROM messages ORDER BY created_at DESC'),
    selected
  });
});

router.post('/messages/:id/read', (req, res) => {
  db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.redirect(req.adminBase + '/messages');
});

router.post('/messages/:id/delete', (req, res) => {
  db.run('DELETE FROM messages WHERE id = ?', [req.params.id]);
  flash(req, 'success', 'Message deleted.');
  res.redirect(req.adminBase + '/messages');
});

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

router.get('/media', (req, res) => {
  adminView(res, 'media', {
    title: 'Media',
    section: 'media',
    items: db.all('SELECT * FROM media ORDER BY created_at DESC')
  });
});

router.post('/media', upload.secure('file'), (req, res) => {
  if (!req.file) {
    flash(req, 'error', 'Choose an image to upload.');
    return res.redirect(req.adminBase + '/media');
  }

  recordMedia(req.file);
  flash(req, 'success', 'Image uploaded.');
  res.redirect(req.adminBase + '/media');
});

router.post('/media/:id/delete', (req, res, next) => {
  const item = db.get('SELECT * FROM media WHERE id = ?', [req.params.id]);
  if (!item) return next();

  removeUpload('/uploads/' + item.filename);
  flash(req, 'success', 'Image deleted.');
  res.redirect(req.adminBase + '/media');
});

/* -------------------------------------------------------------------------- */
/* Users & roles                                                               */
/* -------------------------------------------------------------------------- */

const ROLES = ['admin', 'editor', 'reader'];

router.get('/users', (req, res) => {
  const users = db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC');
  adminView(res, 'users', { title: 'Users', section: 'users', users });
});

router.get('/users/new', (req, res) => {
  adminView(res, 'user-form', {
    title: 'Add user',
    section: 'users',
    mode: 'new',
    user: { id: null, name: '', email: '', role: 'editor' },
    errors: []
  });
});

router.post('/users', (req, res) => {
  const name = h.cleanText(req.body.name, 120);
  const email = h.cleanText(req.body.email, 160).toLowerCase();
  const role = ROLES.includes(req.body.role) ? req.body.role : 'editor';
  const password = String(req.body.password || '');
  const errors = [];

  if (!name) errors.push('Enter a name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('Enter a valid email address.');
  if (email && auth.findByEmail(email)) errors.push('That email address is already in use.');
  if (password.length < 10) errors.push('Use at least 10 characters for the password.');

  if (errors.length) {
    return res.status(422).render('admin/user-form', {
      title: 'Add user',
      section: 'users',
      mode: 'new',
      user: { id: null, name, email, role },
      errors
    });
  }

  db.insert('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', [
    name, email, auth.hashPassword(password), role, db.nowIso()
  ]);
  flash(req, 'success', 'User added.');
  res.redirect(req.adminBase + '/users');
});

router.get('/users/:id/edit', (req, res) => {
  const user = db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.params.id]);
  if (!user) {
    return res.status(404).render('admin/error', { status: 404, message: 'That user does not exist.' });
  }
  adminView(res, 'user-form', {
    title: 'Edit user',
    section: 'users',
    mode: 'edit',
    user,
    errors: []
  });
});

router.post('/users/:id', (req, res) => {
  const target = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) {
    return res.status(404).render('admin/error', { status: 404, message: 'That user does not exist.' });
  }

  const name = h.cleanText(req.body.name, 120);
  const email = h.cleanText(req.body.email, 160).toLowerCase();
  const role = ROLES.includes(req.body.role) ? req.body.role : target.role;
  const password = String(req.body.password || '');
  const errors = [];
  const adminCount = db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").n;

  if (!name) errors.push('Enter a name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('Enter a valid email address.');
  if (email && db.get('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?', [email, target.id])) {
    errors.push('That email address is already in use.');
  }
  if (target.role === 'admin' && role !== 'admin' && adminCount <= 1) {
    errors.push('Keep at least one administrator.');
  }
  if (password && password.length < 10) errors.push('Use at least 10 characters for the new password.');
  if (target.id === req.user.id && role !== 'admin' && adminCount <= 1) {
    errors.push('You cannot remove your own administrator role while you are the only admin.');
  }

  if (errors.length) {
    return res.status(422).render('admin/user-form', {
      title: 'Edit user',
      section: 'users',
      mode: 'edit',
      user: { ...target, name, email, role },
      errors
    });
  }

  db.run('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, target.id]);
  if (password) {
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [auth.hashPassword(password), target.id]);
  }
  flash(req, 'success', 'User updated.');
  res.redirect(req.adminBase + '/users');
});

router.post('/users/:id/delete', (req, res) => {
  const target = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) {
    flash(req, 'error', 'That user does not exist.');
    return res.redirect(req.adminBase + '/users');
  }
  if (target.id === req.user.id) {
    flash(req, 'error', 'You cannot delete your own account.');
    return res.redirect(req.adminBase + '/users');
  }
  const adminCount = db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").n;
  if (target.role === 'admin' && adminCount <= 1) {
    flash(req, 'error', 'Keep at least one administrator.');
    return res.redirect(req.adminBase + '/users');
  }
  db.run('DELETE FROM users WHERE id = ?', [target.id]);
  flash(req, 'success', 'User removed.');
  res.redirect(req.adminBase + '/users');
});

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

const schema = require('../lib/settings-schema');

/** Map of every setting key to its field definition, built once at start-up. */
const SETTING_FIELDS = schema.TABS.reduce((map, tab) => {
  tab.sections.forEach((section) => {
    section.fields.forEach((field) => {
      map[field.key] = field;
    });
  });
  return map;
}, {});

/** The setting keys each tab is allowed to write. */
const SETTING_GROUPS = schema.TABS.reduce((groups, tab) => {
  groups[tab.id] = schema.keysOf(tab);
  return groups;
}, {});

/** Coerce a submitted repeater cell into a safe string. */
function cleanCell(column, raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (column.type === 'select') {
    const allowed = (column.options || []).map((option) => option[0]);
    const chosen = String(value || '').trim();
    return allowed.includes(chosen) ? chosen : column.default || allowed[0] || '';
  }

  if (column.type === 'lines') {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => h.stripDashes(h.cleanText(line, column.max || 160)))
      .filter(Boolean)
      .slice(0, 10)
      .join('\n');
  }

  if (column.type === 'link') {
    const candidate = String(value || '').trim().slice(0, 300);
    if (candidate === 'mailto') return candidate;
    if (/^\/(?![/\\])[^\s"'<>]*$/.test(candidate)) return candidate;
    if (/^(?:https?:|mailto:|tel:)[^\s"'<>]+$/i.test(candidate)) return candidate;
    return '';
  }

  if (column.type === 'image') {
    const candidate = String(value || '').trim();
    if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(candidate)) return candidate;
    if (/^\/img\/[A-Za-z0-9._/-]+$/.test(candidate)) return candidate;
    if (/^https:\/\/[^\s"'<>]+$/i.test(candidate)) return candidate;
    return '';
  }

  if (column.type === 'textarea') return h.stripDashes(h.cleanText(value, 800));
  return h.stripDashes(h.cleanText(value, column.max || 200));
}

/**
 * Rebuild a repeatable block from its posted `<key>__<column>` fields.
 * Returns null when the block was not part of the submitted form, so saving a
 * different tab can never wipe it.
 */
function readRepeater(definition, body) {
  if (body[`${definition.key}__present`] === undefined) return null;

  const columns = definition.columns;
  const posted = {};
  let longest = 0;

  columns.forEach((column) => {
    const raw = body[`${definition.key}__${column.name}`];
    const list = raw === undefined ? [] : [].concat(raw);
    posted[column.name] = list;
    longest = Math.max(longest, list.length);
  });

  const rows = [];
  const limit = Math.min(definition.maxRows || 12, longest);
  const required = columns[0].name;

  for (let index = 0; index < limit; index += 1) {
    const row = {};
    columns.forEach((column) => {
      row[column.name] = cleanCell(column, posted[column.name][index]);
    });
    if (row[required]) rows.push(row);
  }

  return rows;
}

/** Images the image picker can suggest. */
function imageLibrary() {
  let photos = [];
  try {
    photos = fs
      .readdirSync(path.join(config.root, 'public', 'img', 'photos'))
      .filter((file) => /\.(jpe?g|png|webp|gif|avif)$/i.test(file))
      .sort()
      .map((file) => `/img/photos/${file}`);
  } catch (error) {
    photos = [];
  }

  const uploads = db.all('SELECT filename FROM media ORDER BY id DESC LIMIT 80').map((row) => `/uploads/${row.filename}`);
  return photos.concat(uploads);
}

router.get('/settings', (req, res) => {
  const tabId = schema.TAB_IDS.includes(req.query.tab) ? req.query.tab : 'general';
  const tabSchema = schema.getTab(tabId);
  const settings = db.getSettings();

  adminView(res, 'settings', {
    title: 'Site settings',
    section: 'settings',
    settings,
    tabs: schema.TABS,
    tab: tabId,
    tabSchema,
    imageLibrary: imageLibrary(),
    menuRows: h.jsonList(settings.menu_links)
      .map((item) => ({ label: item.label || '', url: item.url || '' }))
      .filter((item) => item.label),
    partnerRows: h
      .jsonList(settings.partners)
      .map((item) => (typeof item === 'string' ? { name: item, url: '' } : { name: item.name || '', url: item.url || '' }))
      .filter((item) => item.name),
    repeaters: schema.repeatersOf(tabSchema).map((definition) => ({
      definition,
      rows: h.jsonList(settings[definition.key])
    }))
  });
});

router.post('/settings', upload.secureFields([{ name: 'hero_image_file', maxCount: 1 }, { name: 'hero_image_file_2', maxCount: 1 }, { name: 'logo_file', maxCount: 1 }]), (req, res) => {
  const tabId = schema.TAB_IDS.includes(req.body.tab) ? req.body.tab : 'general';
  const tabSchema = schema.getTab(tabId);
  const allowed = SETTING_GROUPS[tabId] || [];
  const updates = {};

  allowed.forEach((key) => {
    const field = SETTING_FIELDS[key] || {};

    /* The admin path is validated separately below. */
    if (key === 'admin_path') return;

    if (field.type === 'checkbox') {
      updates[key] = req.body[key] === '1' ? '1' : '0';
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, key)) return;
    const value = req.body[key];

    if (schema.COLORS.includes(key)) {
      if (/^#[0-9a-f]{6}$/i.test(String(value).trim())) updates[key] = String(value).trim().toLowerCase();
      return;
    }

    if (schema.NUMBERS[key]) {
      const number = parseInt(value, 10);
      if (!Number.isNaN(number)) {
        const [min, max] = schema.NUMBERS[key];
        updates[key] = String(Math.min(max, Math.max(min, number)));
      }
      return;
    }

    if (schema.CHOICES[key]) {
      if (schema.CHOICES[key].includes(String(value))) updates[key] = String(value);
      return;
    }

    updates[key] = h.stripDashes(h.cleanText(value, schema.isLongText(key) ? 1200 : 400));
  });

  if (tabId === 'security') {
    const raw = String(req.body.admin_path || '').trim().toLowerCase();
    const clean = '/' + raw.replace(/^\/+|\/+$/g, '');
    const reserved = ['/admin', '/about', '/programs', '/impact', '/stories', '/events', '/contact', '/donate', '/get-involved', '/privacy', '/search', '/login', '/css', '/js', '/img', '/uploads', '/healthz'];
    if (/^\/[a-z0-9][a-z0-9-]{4,48}$/.test(clean) && !reserved.includes(clean)) {
      updates.admin_path = clean;
    } else {
      flash(req, 'error', 'Choose a path with letters, numbers and hyphens, at least 6 characters. It cannot match a public page.');
    }
  }

  schema.repeatersOf(tabSchema).forEach((definition) => {
    const rows = readRepeater(definition, req.body);
    if (rows) updates[definition.key] = JSON.stringify(rows);
  });

  const menuLabels = req.body.menu_label || req.body['menu_label[]'];
  if (menuLabels !== undefined) {
    const labels = [].concat(menuLabels);
    const urls = [].concat(req.body.menu_url || req.body['menu_url[]'] || []);
    const items = labels.map((label, index) => {
      const cleanLabel = h.stripDashes(h.cleanText(label, 40));
      const rawUrl = String(urls[index] || '').trim();
      let cleanUrl = '';
      if (rawUrl.startsWith('/')) cleanUrl = rawUrl;
      else if (rawUrl) {
        try {
          const parsed = new URL(rawUrl);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') cleanUrl = parsed.toString();
        } catch (error) {
          cleanUrl = '';
        }
      }
      return { label: cleanLabel, url: cleanUrl };
    }).filter((item) => item.label && item.url);
    if (items.length) updates.menu_links = JSON.stringify(items);
  }

  const partnerNames = req.body.partner_name || req.body['partner_name[]'];
  if (partnerNames !== undefined) {
    const names = [].concat(partnerNames);
    const urls = [].concat(req.body.partner_url || req.body['partner_url[]'] || []);
    const rows = names.map((name, index) => {
      const cleanName = h.stripDashes(h.cleanText(name, 120));
      let cleanUrl = '';
      const rawUrl = String(urls[index] || '').trim();
      if (rawUrl) {
        try {
          const parsed = new URL(rawUrl);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') cleanUrl = parsed.toString();
        } catch (error) {
          cleanUrl = '';
        }
      }
      return { name: cleanName, url: cleanUrl };
    }).filter((row) => row.name);
    updates.partners = JSON.stringify(rows);
  }

  const files = req.files || {};
  const heroFile = files.hero_image_file && files.hero_image_file[0];
  const heroFile2 = files.hero_image_file_2 && files.hero_image_file_2[0];
  const logoFile = files.logo_file && files.logo_file[0];

  if (heroFile) {
    const current = db.getSetting('hero_image');
    if (current) removeUpload(current);
    recordMedia(heroFile);
    updates.hero_image = imagePath(heroFile);
  }

  if (heroFile2) {
    const current = db.getSetting('hero_image_2');
    if (current) removeUpload(current);
    recordMedia(heroFile2);
    updates.hero_image_2 = imagePath(heroFile2);
  }

  if (req.body.remove_hero_image_2 === '1') {
    const current = db.getSetting('hero_image_2');
    if (current) removeUpload(current);
    updates.hero_image_2 = '';
  }

  if (logoFile) {
    const current = db.getSetting('logo');
    if (current) removeUpload(current);
    recordMedia(logoFile);
    updates.logo = imagePath(logoFile);
  }

  if (req.body.remove_logo === '1') {
    const current = db.getSetting('logo');
    if (current) removeUpload(current);
    updates.logo = '';
  }

  if (req.body.remove_hero_image === '1') {
    const current = db.getSetting('hero_image');
    if (current) removeUpload(current);
    updates.hero_image = '';
  }

  db.setSettings(updates);

  if (tabId === 'security' && updates.admin_path) {
    flash(req, 'success', 'Admin URL changed. Use the new address from now on.');
    return res.redirect(updates.admin_path + '/settings?tab=security');
  }
  flash(req, 'success', 'Settings saved.');
  res.redirect(adminUrl(req, `/settings?tab=${tabId}`));
});

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

router.get('/profile', (req, res) => {
  adminView(res, 'profile', {
    title: 'Your account',
    section: 'profile',
    errors: [],
    notice: null
  });
});

router.post('/profile', (req, res) => {
  const name = h.cleanText(req.body.name, 160);
  const email = h.cleanText(req.body.email, 160);
  const errors = [];

  if (!name) errors.push('Your name cannot be empty.');
  if (!h.isEmail(email)) errors.push('Enter a valid email address.');

  const clash = db.get('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?', [email, req.user.id]);
  if (clash) errors.push('Another account already uses that email address.');

  if (errors.length) {
    return res.status(422).render('admin/profile', {
      title: 'Your account',
      section: 'profile',
      errors,
      notice: null
    });
  }

  db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email.toLowerCase(), req.user.id]);
  flash(req, 'success', 'Account details updated.');
  res.redirect(req.adminBase + '/profile');
});

router.post('/profile/password', (req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  const confirm = String(req.body.confirm_password || '');
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const errors = [];

  if (!auth.verifyPassword(current, user.password_hash)) errors.push('Your current password is not correct.');
  if (next.length < 10) errors.push('Use at least 10 characters for the new password.');
  if (next !== confirm) errors.push('The new passwords do not match.');

  if (errors.length) {
    return res.status(422).render('admin/profile', {
      title: 'Your account',
      section: 'profile',
      errors,
      notice: null
    });
  }

  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [auth.hashPassword(next), user.id]);
  flash(req, 'success', 'Password changed.');
  res.redirect(req.adminBase + '/profile');
});

module.exports = router;
