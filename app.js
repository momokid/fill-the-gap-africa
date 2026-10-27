'use strict';

require('dotenv').config();

process.env.TZ = process.env.TZ || 'Africa/Accra';

const path = require('path');
const express = require('express');
const session = require('cookie-session');

const config = require('./config');
const db = require('./lib/db');
const helpers = require('./lib/helpers');
const csrf = require('./lib/csrf');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', config.trustProxy ? 1 : false);

/* -------------------------------------------------------------------------- */
/* Security headers & basics                                                   */
/* -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (config.isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));

app.use(
  session({
    name: config.sessionName,
    keys: [config.sessionSecret],
    maxAge: config.sessionMaxAge,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/'
  })
);

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: config.isProduction ? '30d' : 0,
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}uploads${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return;
      }

      if (!config.isProduction && /\.(css|js)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    }
  })
);

/* -------------------------------------------------------------------------- */
/* Shared view data                                                            */
/* -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  if (!config.isProduction) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  const settings = db.getSettings();
  const base = config.baseUrl || `${req.protocol}://${req.get('host')}`;
  const cleanPath = req.originalUrl.split('?')[0];

  res.locals.site = settings;
  res.locals.adminBase = settings.admin_path || config.adminPath;
  req.adminBase = res.locals.adminBase;
  res.locals.h = helpers;
  res.locals.currentPath = req.path;
  res.locals.year = new Date().getFullYear();
  res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
  res.locals.currentUser = null;
  res.locals.baseUrl = base;
  res.locals.canonical = base + cleanPath;
  res.locals.meta = {
    title: settings.site_name,
    description: settings.site_description,
    image: ''
  };

  if (req.session) req.session.flash = null;

  res.locals.nav = (() => {
    try {
      const parsed = JSON.parse(settings.menu_links || '[]');
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .map((item) => ({ label: item.label || '', url: item.url || '#' }))
          .filter((item) => item.label);
      }
    } catch (error) {
      // fall through to defaults
    }
    return [
      { label: 'About', url: '/about' },
      { label: 'Programs', url: '/programs' },
      { label: 'Impact', url: '/impact' },
      { label: 'Stories', url: '/stories' },
      { label: 'Events', url: '/events' },
      { label: 'Contact', url: '/contact' }
    ];
  })();

  res.locals.socials = [
    { key: 'facebook', label: 'Facebook', url: settings.social_facebook },
    { key: 'instagram', label: 'Instagram', url: settings.social_instagram },
    { key: 'linkedin', label: 'LinkedIn', url: settings.social_linkedin },
    { key: 'x', label: 'X', url: settings.social_x },
    { key: 'youtube', label: 'YouTube', url: settings.social_youtube }
  ].filter((item) => item.url);

  res.locals.partners = (() => {
    try {
      const parsed = JSON.parse(settings.partners || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => (typeof item === 'string' ? { name: item, url: '' } : { name: item.name || '', url: item.url || '' }))
        .filter((item) => item.name);
    } catch (error) {
      return [];
    }
  })();

  res.locals.footerPrograms = db.all(
    "SELECT title, slug FROM programs WHERE status = 'published' ORDER BY sort_order ASC, id ASC LIMIT 5"
  );

  next();
});

app.use(csrf.middleware);

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */
app.get('/healthz', (req, res) => {
  res.type('text/plain').send('ok');
});

app.use((req, res, next) => {
  const base = req.adminBase || config.adminPath;
  if (req.path === base) {
    req.url = '/';
    return adminRoutes(req, res, next);
  }
  if (req.path.startsWith(base + '/')) {
    req.url = req.url.slice(base.length);
    return adminRoutes(req, res, next);
  }
  next();
});
app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error('[error]', error);
  const status = error.status || 500;

  if (res.headersSent) return;

  if (req.path.startsWith(req.adminBase || config.adminPath)) {
    return res.status(status).render('admin/error', {
      title: 'Something went wrong',
      status,
      message: config.isProduction ? 'An unexpected error occurred.' : error.message
    });
  }

  res.status(status).render('error', {
    title: 'Something went wrong',
    status,
    message: config.isProduction
      ? 'An unexpected error occurred. Please try again, or email us directly.'
      : error.message
  });
});

/* -------------------------------------------------------------------------- */
/* Start                                                                       */
/* -------------------------------------------------------------------------- */
async function start() {
  await db.init();

  // cPanel/Passenger may provide a port number or a Unix socket path.
  const port = process.env.PORT || config.port;
  const isSocket = typeof port === 'string' && !/^\d+$/.test(port);

  const onListening = () => {
    if (!isSocket && Number(port) !== 0) {
      console.log(`\n  Fill The Gap Africa — running on http://localhost:${port}`);
      if (!config.isProduction) {
        console.log(`  Admin: http://localhost:${port}${db.getSetting('admin_path') || config.adminPath}`);
        console.log(`  Sign in: ${config.admin.email}\n`);
      }
    }
    if (config.sessionSecret === 'change-this-session-secret-before-launch') {
      console.warn('  [warning] Set SESSION_SECRET in .env before going live.\n');
    }
  };

  if (process.env.IN_PASSENGER === '1') {
    // cPanel's Passenger node-loader only attaches when asked for its socket.
    return app.listen('passenger', onListening);
  }

  if (isSocket) return app.listen(port, onListening);
  return app.listen(port, config.host, onListening);
}

if (require.main === module || process.env.IN_PASSENGER === '1') {
  start().catch((error) => {
    console.error('Failed to start:', error);
    process.exit(1);
  });
}

module.exports = { app, start };
