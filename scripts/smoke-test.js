'use strict';

/**
 * Development smoke test for a running instance of the site.
 *
 *   npm start                                  # PORT from .env (8090 here)
 *   $env:TEST_BASE='http://127.0.0.1:8090'; npm run smoke
 *
 * For unit-level coverage of the same routes (with a throwaway database) run
 * `npm test` instead.
 */

const BASE = (process.env.TEST_BASE || 'http://127.0.0.1:3100').replace(/\/$/, '');
const ADMIN = (process.env.TEST_ADMIN_PATH || '/ftga-studio').replace(/\/$/, '');
const EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@fillthegapafrica.org';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'ChangeMe123!';

class Client {
  constructor() {
    this.cookies = [];
  }

  cookieHeader() {
    return this.cookies.map((c) => c.split(';')[0]).join('; ');
  }

  async request(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
      cookie: this.cookieHeader(),
      'user-agent': 'ftga-smoke-test'
    };

    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      body = new URLSearchParams(body).toString();
      headers['content-type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(BASE + path, { ...options, headers, body, redirect: 'manual' });

    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    setCookies.forEach((raw) => {
      const pair = raw.split(';')[0];
      const name = pair.split('=')[0];
      this.cookies = this.cookies.filter((c) => !c.startsWith(name + '='));
      this.cookies.push(pair);
    });

    const text = await response.text();
    return { status: response.status, location: response.headers.get('location'), text };
  }

  csrf(html) {
    const match = html.match(/name="_csrf" value="([^"]+)"/);
    return match ? match[1] : '';
  }
}

function assert(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('  ok  ' + message);
}

(async () => {
  console.log(`Public site — ${BASE}`);

  const publicPaths = ['/', '/about', '/programs', '/programs/education', '/impact', '/get-involved', '/donate', '/contact', '/stories', '/events', '/privacy'];
  for (const path of publicPaths) {
    const page = await new Client().request(path);
    assert(page.status === 200, `${path} responds 200`);
  }

  const home = (await new Client().request('/')).text;
  assert(home.includes('font-size: 16px'), 'homepage keeps the 16px type floor');
  assert(home.includes('theme.css?v=11'), 'homepage loads the current theme');
  assert(home.includes('Listen first'), 'homepage steps come from settings');

  const robots = await new Client().request('/robots.txt');
  assert(robots.text.includes('Disallow: ' + ADMIN), 'robots.txt protects the real admin path');

  console.log(`\nStudio — ${BASE}${ADMIN}`);

  const hidden = await new Client().request('/admin/login');
  assert(hidden.status === 404, '/admin/login stays hidden');

  const admin = new Client();
  const loginPage = await admin.request(ADMIN + '/login');
  assert(loginPage.status === 200, 'login page loads');

  const badLogin = await admin.request(ADMIN + '/login', {
    method: 'POST',
    body: { _csrf: admin.csrf(loginPage.text), email: EMAIL, password: 'wrong' }
  });
  assert(badLogin.status === 401, 'wrong password is rejected');

  const fresh = await admin.request(ADMIN + '/login');
  const login = await admin.request(ADMIN + '/login', {
    method: 'POST',
    body: { _csrf: admin.csrf(fresh.text), email: EMAIL, password: PASSWORD, next: ADMIN }
  });
  assert(login.status === 302 && login.location === ADMIN, 'valid login redirects to the dashboard');
  assert(!login.location.startsWith('/admin'), 'login redirect keeps the private admin path');

  const dashboard = await admin.request(ADMIN);
  assert(dashboard.status === 200 && dashboard.text.includes('Unread messages'), 'dashboard renders');

  for (const tab of ['general', 'homepage', 'about', 'impact', 'involved', 'contact', 'design', 'social', 'giving', 'security']) {
    const page = await admin.request(`${ADMIN}/settings?tab=${tab}`);
    assert(page.status === 200 && page.text.includes('Save settings'), `settings tab “${tab}” renders`);
  }

  const aboutTab = await admin.request(ADMIN + '/settings?tab=about');
  assert(aboutTab.text.includes('name="about_values__title"'), 'repeatable blocks render their fields');

  const social = await admin.request(ADMIN + '/settings?tab=social');
  const saved = await admin.request(ADMIN + '/settings', {
    method: 'POST',
    body: {
      _csrf: admin.csrf(social.text),
      tab: 'social',
      social_facebook: 'https://web.facebook.com/profile.php?id=61560412077986'
    }
  });
  assert(saved.status === 302 && saved.location === `${ADMIN}/settings?tab=social`, 'saving settings returns to the studio');

  const created = await admin.request(ADMIN + '/posts/new');
  const form = new FormData();
  form.append('_csrf', admin.csrf(created.text));
  form.append('type', 'post');
  form.append('title', 'Smoke test story');
  form.append('slug', 'smoke-test-story');
  form.append('excerpt', 'A temporary story created by the smoke test.');
  form.append('category', 'Testing');
  form.append('status', 'draft');
  form.append('content', '<p>This is a smoke test story with enough content to pass validation checks.</p>');

  const posted = await admin.request(ADMIN + '/posts', { method: 'POST', body: form });
  assert(posted.status === 302 && posted.location === `${ADMIN}/posts`, 'draft story created inside the studio');

  const postsList = await admin.request(ADMIN + '/posts');
  assert(postsList.text.includes('Smoke test story'), 'story appears in the list');

  const idMatch = postsList.text.match(/href="[^"]*\/posts\/(\d+)\/edit"[^>]*>[^<]*Smoke test story/);
  if (idMatch) {
    const removed = await admin.request(`${ADMIN}/posts/${idMatch[1]}/delete`, {
      method: 'POST',
      body: { _csrf: admin.csrf(postsList.text) }
    });
    assert(removed.status === 302, 'test story deleted');
  } else {
    console.log('  ..  could not find the test story id to clean up');
  }

  console.log('\nAll checks passed.');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
