'use strict';

/**
 * Fill The Gap Africa — website & content management app.
 *
 * Runs on plain Node.js (18+) and needs no native build tools, which makes it
 * safe to deploy on shared cPanel hosting through "Setup Node.js App".
 */

const path = require('path');

const root = __dirname;

module.exports = {
  root,

  // HTTP
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  baseUrl: (process.env.BASE_URL || '').replace(/\/$/, ''),
  trustProxy: process.env.TRUST_PROXY !== 'false',

  // Private admin path. Override with ADMIN_PATH or change it in Settings > Security.
  adminPath: (() => {
    const raw = (process.env.ADMIN_PATH || '/ftga-studio').trim();
    const clean = ('/' + raw.replace(/^\/+|\/+$/g, '')).toLowerCase();
    return /^\/[a-z0-9][a-z0-9-]{3,48}$/.test(clean) ? clean : '/ftga-studio';
  })(),

  // Environment. On cPanel set NODE_ENV=production.
  isProduction: process.env.NODE_ENV === 'production',

  // Sessions are signed cookies. Always set SESSION_SECRET in production.
  sessionSecret: process.env.SESSION_SECRET || 'change-this-session-secret-before-launch',
  sessionName: 'ftga.sid',
  sessionMaxAge: 1000 * 60 * 60 * 12,

  // First administrator. Used only when the users table is empty.
  admin: {
    name: process.env.ADMIN_NAME || 'Site Administrator',
    email: (process.env.ADMIN_EMAIL || 'admin@fillthegapafrica.org').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!'
  },

  // Storage
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  uploadDir: process.env.UPLOAD_DIR || path.join(root, 'public', 'uploads'),
  dbFile: process.env.DB_FILE || 'site.db',

  // Uploads
  maxUploadBytes: (parseInt(process.env.MAX_UPLOAD_MB, 10) || 8) * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],

  // Mail (optional). Without SMTP, enquiries are still stored in the dashboard.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Fill The Gap Africa <no-reply@fillthegapafrica.org>',
    to: process.env.MAIL_TO || ''
  },

  // Locale (Ghana)
  timezone: process.env.TZ || 'Africa/Accra'
};
