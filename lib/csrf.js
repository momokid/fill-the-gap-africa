'use strict';

const crypto = require('crypto');

/**
 * CSRF protection using a synchronised token stored in the signed session
 * cookie. Multipart requests are parsed by multer *after* this middleware, so
 * for those the token is verified once the body exists (see `enforce`).
 */

function tokenFrom(req) {
  return (req.body && req.body._csrf) || req.get('x-csrf-token') || '';
}

function isValid(req) {
  const provided = String(tokenFrom(req));
  const expected = req.session ? req.session.csrf : '';

  if (!provided || !expected || provided.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch (error) {
    return false;
  }
}

function reject(req, res) {
  res.status(403);
  return res.render('error', {
    title: 'Session expired',
    status: 403,
    message:
      'Your session expired before the form was submitted. Go back, refresh the page and try again.'
  });
}

function middleware(req, res, next) {
  if (!req.session) return next();

  if (!req.session.csrf) {
    req.session.csrf = crypto.randomBytes(24).toString('hex');
  }

  res.locals.csrfToken = req.session.csrf;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const type = String(req.headers['content-type'] || '');

    // The body is not parsed yet for uploads; the route verifies after multer.
    if (type.startsWith('multipart/form-data')) {
      req.csrfDeferred = true;
      return next();
    }

    if (!isValid(req)) {
      return reject(req, res);
    }
  }

  return next();
}

function enforce(req, res, next) {
  if (req.csrfDeferred && !isValid(req)) {
    return reject(req, res);
  }
  return next();
}

module.exports = { middleware, enforce };
