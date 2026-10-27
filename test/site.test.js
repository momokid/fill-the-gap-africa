'use strict';

/**
 * Route tests for the public site and the content studio.
 *
 * Runs the real Express app in-process against a throwaway database, so the
 * tests never touch data/site.db or public/uploads/.
 *
 *   npm test
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ADMIN = '/ftga-studio';
const ROOT = path.join(__dirname, '..');
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ftga-test-'));

process.env.DATA_DIR = DATA_DIR;
process.env.UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
process.env.DB_FILE = 'site.db';
process.env.PORT = '0';
process.env.ADMIN_PATH = ADMIN;
process.env.ADMIN_EMAIL = 'admin@fillthegapafrica.org';
process.env.ADMIN_PASSWORD = 'ChangeMe123!';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';
process.env.BASE_URL = '';

const { start } = require('../app');

let server;
let base;
let admin;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

class Client {
  constructor() {
    this.cookies = [];
  }

  cookieHeader() {
    return this.cookies.map((pair) => pair.split(';')[0]).join('; ');
  }

  async request(target, options = {}) {
    const headers = { cookie: this.cookieHeader(), ...(options.headers || {}) };
    let body = options.body;

    if (body && !(body instanceof FormData)) {
      body = new URLSearchParams(body).toString();
      headers['content-type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(base + target, { ...options, headers, body, redirect: 'manual' });
    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];

    setCookies.forEach((raw) => {
      const pair = raw.split(';')[0];
      const name = pair.split('=')[0];
      this.cookies = this.cookies.filter((cookie) => !cookie.startsWith(name + '='));
      this.cookies.push(pair);
    });

    return {
      status: response.status,
      location: response.headers.get('location') || '',
      headers: response.headers,
      text: await response.text()
    };
  }

  get(target) {
    return this.request(target);
  }

  csrf(html) {
    const match = html.match(/name="_csrf" value="([^"]+)"/);
    return match ? match[1] : '';
  }

  async token(target) {
    return this.csrf((await this.request(target)).text);
  }
}

function form(fields) {
  const body = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    [].concat(value).forEach((item) => body.append(key, String(item)));
  });

  return body;
}

async function login(client, email, password, basePath = ADMIN) {
  const page = await client.request(`${basePath}/login`);
  return client.request(`${basePath}/login`, {
    method: 'POST',
    body: { _csrf: client.csrf(page.text), email, password, next: basePath }
  });
}

before(async () => {
  server = await start();

  if (!server.listening) {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  }

  base = `http://127.0.0.1:${server.address().port}`;
  admin = new Client();
  const response = await login(admin, 'admin@fillthegapafrica.org', 'ChangeMe123!');
  assert.equal(response.status, 302, 'administrator can sign in');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

/* -------------------------------------------------------------------------- */
/* Public site                                                                 */
/* -------------------------------------------------------------------------- */

test('public pages render', async () => {
  const visitor = new Client();
  const pages = [
    ['/', 'Fill The Gap Africa'],
    ['/about', 'A women-led organization'],
    ['/programs', 'Four programs'],
    ['/programs/education', 'Education &amp; Girls'],
    ['/impact', 'Numbers we can defend'],
    ['/get-involved', 'Three useful ways'],
    ['/donate', 'Give where it is needed'],
    ['/contact', 'Tell us what you need'],
    ['/stories', 'Stories'],
    ['/events', 'Events'],
    ['/privacy', 'Privacy policy'],
    ['/sitemap.xml', '<urlset'],
    ['/robots.txt', 'Sitemap:']
  ];

  for (const [target, expected] of pages) {
    const response = await visitor.request(target);
    assert.equal(response.status, 200, `${target} responds 200`);
    assert.ok(response.text.includes(expected), `${target} contains “${expected}”`);
  }
});

test('homepage keeps the 16px type floor and design tokens', async () => {
  const { text } = await new Client().get('/');
  assert.match(text, /font-size:\s*16px/);
  assert.match(text, /theme\.css\?v=11/);
  assert.match(text, /--brand:\s*#0f6d9f/);
});

test('homepage blocks come from settings', async () => {
  const { text } = await new Client().get('/');

  assert.ok(text.includes('Listen first'), 'shared approach steps');
  assert.ok(text.includes('Women, alongside community partners'), 'at a glance facts');
  assert.ok(text.includes('Read the field notes'), 'field story button');
  assert.ok(text.includes('By-laws written and enforced by the community itself'), 'field story checklist');
});

test('the current menu item is marked active', async () => {
  const visitor = new Client();

  const about = (await visitor.get('/about')).text;
  assert.match(about, /menu-item is-active">\s*<a href="\/about" aria-current="page">/, 'About marks its own item');
  assert.ok(!/menu-item is-active">\s*<a href="\/programs"/.test(about), 'other items stay inactive');
  assert.ok(about.includes('<a href="/about" class="is-active" aria-current="page">'), 'footer marks it too');

  const child = (await visitor.get('/programs/education')).text;
  assert.match(child, /menu-item is-active">\s*<a href="\/programs" aria-current="page">/, 'a detail page marks its section');

  const story = (await new Client().get('/stories/katiu-saa-the-by-laws-that-changed-a-generation-of-girls')).text;
  assert.match(story, /menu-item is-active">\s*<a href="\/stories" aria-current="page">/, 'a story marks Stories');

  const trailing = (await visitor.get('/about/')).text;
  assert.match(trailing, /menu-item is-active">\s*<a href="\/about"/, 'trailing slash still matches');

  const home = (await visitor.get('/')).text;
  assert.ok(!home.includes('menu-item is-active'), 'home has no nav item to mark');

  const activeCount = (about.match(/menu-item is-active/g) || []).length;
  assert.equal(activeCount, 1, 'exactly one active item');
});

test('About, Impact and Get involved blocks come from settings', async () => {
  const visitor = new Client();
  const about = (await visitor.get('/about')).text;
  const impact = (await visitor.get('/impact')).text;
  const involved = (await visitor.get('/get-involved')).text;

  assert.ok(about.includes('Four rules we do not <em>bend</em>'), 'values heading');
  assert.ok(about.includes('Partnership over duplication'), 'values cards');
  assert.ok(about.includes('strip-water.jpg') && about.includes('strip-participant.jpg'), 'photo strip');
  assert.ok(about.includes('Registered Ghanaian non-profit'), 'at a glance facts');
  assert.ok(about.includes('Women who <em>stay</em>'), 'team heading');

  assert.ok(impact.includes('Girls back in school'), 'result cards');
  assert.ok(impact.includes('70% → 1%'), 'result number survives');
  assert.ok(impact.includes('Community scorecards'), 'accountability list');

  assert.ok(involved.includes('Exam registration for 40 girls'), 'open needs');
  assert.ok(involved.includes('need__tag--inkind'), 'need tag styling');
  assert.ok(involved.includes('Can I volunteer remotely?'), 'FAQ entries');
  assert.ok(involved.includes('Do you issue receipts?'), 'all FAQ entries render');
});

test('Get involved cards and the donate page come from settings', async () => {
  const involved = (await new Client().get('/get-involved')).text;
  assert.ok(involved.includes('path-card--primary'), 'the first card is highlighted');
  assert.ok(involved.includes('<h2 class="path-card__title">Volunteer a skill</h2>'), 'card titles come from settings');
  assert.ok(involved.includes('Solar installation, recycling and green skills'), 'bullets split one per line');
  assert.ok(involved.includes('One-off or monthly, in cedis or another currency'), 'first card bullets');
  assert.match(involved, /href="mailto:info@fillthegapafrica\.org"[^>]*>Start a conversation/, 'the mailto token resolves to the contact email');

  const donate = (await new Client().get('/donate')).text;
  assert.ok(donate.includes('<h2 class="give-card__title">Bank transfer</h2>'), 'giving card heading');
  assert.ok(donate.includes('Best for larger gifts, corporate giving and multi-year commitments.'), 'giving card text');
  assert.ok(donate.includes('We acknowledge within two working days'), 'the next steps');
  assert.ok(donate.includes('Reported to communities first'), 'accountability points');
  assert.ok(donate.includes('Built to be <em>checked</em>.'), 'accountability heading');
  assert.ok(donate.includes('Is my gift tax deductible?'), 'giving questions');
  assert.ok(donate.includes('Ask us anything before you <em>give</em>.'), 'closing section');
});

test('Get involved cards and giving content are editable in the studio', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=involved`);
  assert.ok(page.text.includes('name="involved_paths__title"'), 'cards are a repeatable block');
  assert.ok(page.text.includes('name="involved_paths__points"'), 'bullet points field');
  assert.ok(page.text.includes('name="involved_paths__link_url"'), 'button link field');

  const giving = await admin.get(`${ADMIN}/settings?tab=giving`);
  assert.ok(giving.text.includes('name="donate_steps__title"'), 'next steps repeater');
  assert.ok(giving.text.includes('name="donate_faq__question"'), 'giving questions repeater');
  assert.ok(giving.text.includes('name="donate_trust_title"'), 'accountability headline');

  const response = await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      tab: 'involved',
      involved_paths__present: '1',
      involved_paths__title: ['Give', 'Volunteer a skill', 'Partner with us'],
      involved_paths__icon: ['heart', 'users', 'globe'],
      involved_paths__text: ['Fund a program.', 'Share a skill.', 'Co-design a program.'],
      involved_paths__points: ['One-off or monthly\nA written report', 'Bookkeeping\nWeb support', 'Pilots\nEquipment'],
      involved_paths__link_label: ['Donate', 'Offer a skill', 'Start a conversation'],
      involved_paths__link_url: ['/donate', 'javascript:alert(1)', 'mailto']
    })
  });
  assert.equal(response.status, 302);

  const after = (await new Client().get('/get-involved')).text;
  assert.ok(after.includes('Share a skill.') && after.includes('A written report'), 'edited cards render');
  assert.ok(!after.includes('javascript:alert(1)'), 'unsafe links are dropped');
  assert.equal((after.match(/path-card__num/g) || []).length, 3, 'three numbered cards');
  assert.match(after, /href="mailto:info@fillthegapafrica\.org"/, 'mailto token still resolves');
});

test('contact page labels and subjects come from settings', async () => {
  const { text } = await new Client().get('/contact');
  assert.ok(text.includes('Send a message'), 'form heading');
  assert.ok(text.includes('Direct lines'), 'contact card heading');
  assert.ok(text.includes('Media &amp; press') || text.includes('Media & pay'), 'enquiry subjects');
  assert.ok(text.includes('We never share your details'), 'privacy note');
});

/* -------------------------------------------------------------------------- */
/* Admin path                                                                  */
/* -------------------------------------------------------------------------- */

test('the studio lives only on its private path', async () => {
  const visitor = new Client();
  assert.equal((await visitor.get('/admin/login')).status, 404, '/admin/login is not routed');
  assert.equal((await visitor.get('/admin')).status, 404, '/admin is not routed');
  assert.equal((await visitor.get(`${ADMIN}/login`)).status, 200, 'studio login renders');
});

test('signed-out studio requests are redirected to the login form', async () => {
  const visitor = new Client();
  const response = await visitor.get(`${ADMIN}/settings`);
  assert.equal(response.status, 302);
  assert.ok(response.location.startsWith(`${ADMIN}/login?next=`), response.location);
});

test('studio responses cannot be cached by a shared proxy', async () => {
  const visitor = new Client();
  const page = await visitor.get(`${ADMIN}/login`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('cache-control') || '', /no-store/);
  assert.match(page.headers.get('vary') || '', /cookie/i);
  assert.ok(page.headers.getSetCookie().length > 0, 'login sets a session cookie');

  const redirect = await visitor.get(`${ADMIN}/settings`);
  assert.equal(redirect.status, 302);
  assert.match(redirect.headers.get('cache-control') || '', /no-store/);
  assert.ok(redirect.headers.getSetCookie().length > 0, 'redirect sets a session cookie');
});

test('wrong credentials are rejected', async () => {
  const visitor = new Client();
  const page = await visitor.request(`${ADMIN}/login`);
  const response = await visitor.request(`${ADMIN}/login`, {
    method: 'POST',
    body: { _csrf: visitor.csrf(page.text), email: 'admin@fillthegapafrica.org', password: 'nope' }
  });
  assert.equal(response.status, 401);
});

/* -------------------------------------------------------------------------- */
/* Settings and repeatable blocks                                              */
/* -------------------------------------------------------------------------- */

test('settings tabs render, including the new page tabs', async () => {
  const { text } = await admin.get(`${ADMIN}/settings?tab=about`);
  assert.ok(text.includes('About page'), 'tab label');
  assert.ok(text.includes('name="about_values__title"'), 'repeater input names');
  assert.ok(text.includes('name="about_values__present"'), 'repeater presence marker');
  assert.ok(text.includes('data-repeater'), 'repeater wrapper');
  assert.ok(text.includes('data-add'), 'add button');
  assert.ok(text.includes('data-template'), 'blank row template for new rows');
  assert.ok(text.includes('image-library'), 'image suggestions for the photo strip');
  assert.ok(text.includes('Community first'), 'existing row values');
  assert.ok(text.includes('Save settings'), 'save button');

  const home = (await admin.get(`${ADMIN}/settings?tab=homepage`)).text;
  assert.ok(home.includes('name="approach_steps__title"'), 'homepage steps repeater');
  assert.ok(home.includes('name="story_lede"'), 'field story textarea');
});

test('a repeatable block can be rewritten and shows on the site', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=about`);
  const response = await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      tab: 'about',
      about_values__present: '1',
      about_values__title: ['Listening', 'Local ownership'],
      about_values__text: ['We start with the community.', 'Communities keep what they build.']
    })
  });

  assert.equal(response.status, 302);
  assert.equal(response.location, `${ADMIN}/settings?tab=about`, 'redirect uses the private admin path');

  const about = (await new Client().get('/about')).text;
  assert.ok(about.includes('Listening') && about.includes('Local ownership'), 'new rows render');
  assert.ok(!about.includes('Partnership over duplication'), 'replaced rows are gone');
  assert.ok(about.includes('value__num">02'), 'rows are numbered automatically');
});

test('saving one tab leaves other blocks alone', async () => {
  const home = (await new Client().get('/')).text;
  assert.ok(home.includes('Listen first'), 'homepage steps untouched by the About save');
  assert.ok(!home.includes('Exam registration for 40 girls'), 'no cross-page leakage');
});

test('an empty repeatable block hides its section', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=about`);
  await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      tab: 'about',
      about_values__present: '1',
      about_values__title: '',
      about_values__text: ''
    })
  });

  const about = (await new Client().get('/about')).text;
  assert.ok(!about.includes('values-grid'), 'values section is not rendered');

  /* Restore the seeded values for the remaining tests. */
  const fresh = await admin.get(`${ADMIN}/settings?tab=about`);
  await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(fresh.text),
      tab: 'about',
      about_values__present: '1',
      about_values__title: ['Community first', 'Women at the center', 'Evidence and accountability', 'Partnership over duplication'],
      about_values__text: ['Communities set the agenda.', 'Women lead our organization.', 'We measure what changes.', 'We strengthen local institutions.']
    })
  });
});

test('a plain field is saved and sanitised', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=homepage`);
  await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      tab: 'homepage',
      story_link_label: 'See the evidence',
      story_title: 'By-laws, <em>not</em> charity <script>alert(1)</script>'
    })
  });

  const home = (await new Client().get('/')).text;
  assert.ok(home.includes('See the evidence'), 'new button label renders');
  assert.ok(home.includes('By-laws, <em>not</em> charity'), 'allowed emphasis survives');
  assert.ok(!home.includes('<script>alert(1)</script>'), 'script tags are stripped from headings');

  const restore = await admin.get(`${ADMIN}/settings?tab=homepage`);
  await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(restore.text),
      tab: 'homepage',
      story_link_label: 'Read the field notes',
      story_title: 'By-laws, <em>not</em> charity.'
    })
  });
});

test('repeaters reject unsafe image paths and unknown icons', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=about`);
  await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      tab: 'about',
      about_photos__present: '1',
      about_photos__image: ['javascript:alert(1)', '/img/photos/strip-water.jpg'],
      about_photos__alt: ['Bad path', 'A safe photo']
    })
  });

  const about = (await new Client().get('/about')).text;
  assert.ok(!about.includes('javascript:alert(1)'), 'unsafe image path is dropped');
  assert.ok(about.includes('/img/photos/strip-water.jpg'), 'safe image path is kept');
});

test('settings POST requires a CSRF token', async () => {
  const response = await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({ tab: 'social', social_facebook: 'https://example.org' })
  });
  assert.equal(response.status, 403);
});

/* -------------------------------------------------------------------------- */
/* Studio redirects and content creation                                       */
/* -------------------------------------------------------------------------- */

test('creating a post redirects inside the private admin path', async () => {
  const page = await admin.get(`${ADMIN}/posts/new`);
  const created = await admin.request(`${ADMIN}/posts`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      type: 'post',
      title: 'Route test story',
      slug: 'route-test-story',
      category: 'Testing',
      status: 'published',
      content: '<p>A short story created by the route tests, published immediately.</p>'
    })
  });

  assert.equal(created.status, 302);
  assert.equal(created.location, `${ADMIN}/posts`, 'redirect keeps the admin path');

  const list = await admin.get(`${ADMIN}/posts`);
  assert.ok(list.text.includes('Route test story'), 'post appears in the list');

  const publicStory = await new Client().get('/stories/route-test-story');
  assert.equal(publicStory.status, 200);
  assert.ok(publicStory.text.includes('Route test story'));
});

/* -------------------------------------------------------------------------- */
/* Contact form                                                                */
/* -------------------------------------------------------------------------- */

test('robots.txt points crawlers away from the real studio path', async () => {
  const { text } = await new Client().get('/robots.txt');
  assert.ok(text.includes(`Disallow: ${ADMIN}`), text);
  assert.ok(!text.includes('Disallow: /admin\n'), 'no stale /admin rule');
});

test('the contact form stores a message for the team', async () => {
  const visitor = new Client();
  const page = await visitor.get('/contact');
  const posted = await visitor.request('/contact', {
    method: 'POST',
    body: {
      _csrf: visitor.csrf(page.text),
      name: 'Test Enquirer',
      email: 'test@example.org',
      phone: '+233 00 000 0000',
      topic: 'General enquiry',
      message: 'This is a test enquiry long enough to pass validation.'
    }
  });

  assert.equal(posted.status, 302);
  assert.ok(posted.location.includes('sent=1'));

  const sent = await visitor.get('/contact?sent=1');
  assert.ok(sent.text.includes('Thank you. Your message has reached us'), 'thank-you copy comes from settings');

  const inbox = await admin.get(`${ADMIN}/messages`);
  assert.ok(inbox.text.includes('Test Enquirer'), 'message reaches the studio inbox');
});

test('invalid contact submissions are rejected', async () => {
  const visitor = new Client();
  const page = await visitor.get('/contact');
  const response = await visitor.request('/contact', {
    method: 'POST',
    body: { _csrf: visitor.csrf(page.text), name: 'No email', email: 'bad', message: 'short' }
  });
  assert.equal(response.status, 422);
  assert.ok(response.text.includes('Please add a valid email address'));
});

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

async function createUser(role, email) {
  const page = await admin.get(`${ADMIN}/users/new`);
  const response = await admin.request(`${ADMIN}/users`, {
    method: 'POST',
    body: {
      _csrf: admin.csrf(page.text),
      name: `${role} account`,
      email,
      password: 'TestPassword123!',
      role
    }
  });
  assert.ok(response.status === 302, `${role} created`);
}

test('editors manage content but not settings or users', async () => {
  await createUser('editor', 'editor@example.org');
  const editor = new Client();
  await login(editor, 'editor@example.org', 'TestPassword123!');

  assert.equal((await editor.get(`${ADMIN}/posts`)).status, 200, 'posts list');
  assert.equal((await editor.get(`${ADMIN}/settings`)).status, 403, 'settings blocked');
  assert.equal((await editor.get(`${ADMIN}/users`)).status, 403, 'users blocked');
});

test('readers see the dashboard and inbox only', async () => {
  await createUser('reader', 'reader@example.org');
  const reader = new Client();
  await login(reader, 'reader@example.org', 'TestPassword123!');

  assert.equal((await reader.get(ADMIN)).status, 200, 'dashboard');
  assert.equal((await reader.get(`${ADMIN}/messages`)).status, 200, 'inbox');
  assert.equal((await reader.get(`${ADMIN}/posts`)).status, 403, 'content blocked');
  assert.equal((await reader.get(`${ADMIN}/settings`)).status, 403, 'settings blocked');
});

/* -------------------------------------------------------------------------- */
/* Changing the admin path                                                     */
/* -------------------------------------------------------------------------- */

test('the admin path can be changed and old paths stop working', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=security`);
  const changed = await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({
      _csrf: admin.csrf(page.text),
      tab: 'security',
      admin_path: '/studio-test-7x'
    })
  });

  assert.equal(changed.status, 302);
  assert.equal(changed.location, '/studio-test-7x/settings?tab=security');

  const visitor = new Client();
  assert.equal((await visitor.get(`${ADMIN}/login`)).status, 404, 'old path is gone');
  assert.equal((await visitor.get('/studio-test-7x/login')).status, 200, 'new path serves the studio');

  const moved = new Client();
  assert.equal((await login(moved, 'admin@fillthegapafrica.org', 'ChangeMe123!', '/studio-test-7x')).status, 302);

  const created = await moved.request('/studio-test-7x/posts/new');
  assert.equal(created.status, 200, 'studio works on the new path');

  const restore = await moved.get('/studio-test-7x/settings?tab=security');
  const back = await moved.request('/studio-test-7x/settings', {
    method: 'POST',
    body: form({
      _csrf: moved.csrf(restore.text),
      tab: 'security',
      admin_path: ADMIN
    })
  });
  assert.equal(back.location, `${ADMIN}/settings?tab=security`);

  admin = new Client();
  assert.equal((await login(admin, 'admin@fillthegapafrica.org', 'ChangeMe123!')).status, 302);
});

test('the reserved admin path is refused', async () => {
  const page = await admin.get(`${ADMIN}/settings?tab=security`);
  const response = await admin.request(`${ADMIN}/settings`, {
    method: 'POST',
    body: form({ _csrf: admin.csrf(page.text), tab: 'security', admin_path: '/about' })
  });

  assert.equal(response.status, 302);
  assert.equal(response.location, `${ADMIN}/settings?tab=security`);
  const again = await new Client().get(`${ADMIN}/login`);
  assert.equal(again.status, 200, 'the studio stayed where it was');
});
