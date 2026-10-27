'use strict';

const bcrypt = require('bcryptjs');
const db = require('./db');

/* Very small in-memory throttle for the login form. */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function findByEmail(email) {
  return db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [String(email || '').trim()]);
}

function findById(id) {
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

function throttled(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearFailures(ip) {
  attempts.delete(ip);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    const user = findById(req.session.userId);
    if (user) {
      req.user = user;
      res.locals.currentUser = { id: user.id, name: user.name, email: user.email, role: user.role };
      return next();
    }
    req.session = null;
  }

  const base = req.adminBase || '/admin';
  const redirectTo = encodeURIComponent(req.originalUrl || base);
  return res.redirect(`${base}/login?next=${redirectTo}`);
}

function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.userId && findById(req.session.userId)) {
    return res.redirect(req.adminBase || '/admin');
  }
  return next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  findByEmail,
  findById,
  throttled,
  recordFailure,
  clearFailures,
  requireAuth,
  redirectIfAuthed
};
