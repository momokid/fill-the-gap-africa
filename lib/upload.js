'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const csrf = require('./csrf');

fs.mkdirSync(config.uploadDir, { recursive: true });

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const ext = EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  if (!config.allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, WebP, GIF or AVIF images can be uploaded.'));
  }
  return cb(null, true);
}

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxUploadBytes, files: 3 }
});

function single(field) {
  return uploader.single(field);
}

/**
 * Parse an upload, then verify the CSRF token that arrived with the multipart
 * body. Used by every admin form with a file input.
 */
function secure(field) {
  const parse = uploader.single(field);

  return function secureUpload(req, res, next) {
    parse(req, res, (error) => {
      if (error) return next(error);
      return csrf.enforce(req, res, next);
    });
  };
}

/** Remove an uploaded file when it is replaced or deleted. */
function removeFile(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const target = path.join(config.uploadDir, path.basename(publicPath));
  if (target.startsWith(config.uploadDir) && fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
    } catch (error) {
      console.warn('[upload] could not delete', target, error.message);
    }
  }
}

function secureFields(fields) {
  const parse = uploader.fields(fields);

  return function secureUpload(req, res, next) {
    parse(req, res, (error) => {
      if (error) return next(error);
      return csrf.enforce(req, res, next);
    });
  };
}

module.exports = { single, secure, secureFields, removeFile, uploader, EXTENSIONS };
