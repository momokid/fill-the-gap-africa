'use strict';

const sanitizeHtml = require('sanitize-html');
const icons = require('./icons');

const TZ = 'Africa/Accra';

/* -------------------------------------------------------------------------- */
/* Text                                                                        */
/* -------------------------------------------------------------------------- */

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, length = 160) {
  const clean = stripHtml(text);
  if (clean.length <= length) return clean;
  return clean.slice(0, length).replace(/\s+\S*$/, '') + '…';
}

function readingTime(html) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function initials(name) {
  const parts = String(name || '')
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || 'FG').toUpperCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value, style = 'long') {
  const date = toDate(value);
  if (!date) return '';
  const options =
    style === 'short'
      ? { day: '2-digit', month: 'short', year: 'numeric' }
      : style === 'month'
        ? { month: 'long', year: 'numeric' }
        : style === 'long'
          ? { day: 'numeric', month: 'long', year: 'numeric' }
          : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...options }).format(date);
}

function formatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDate(date)} · ${formatTime(date)}`;
}

function eventWhen(start, end) {
  const startDate = toDate(start);
  if (!startDate) return '';
  const endDate = toDate(end);
  const day = formatDate(startDate, 'full');
  const base = `${day}, ${formatTime(startDate)}`;
  if (endDate && endDate.toDateString() === startDate.toDateString()) {
    return `${base} to ${formatTime(endDate)} GMT`;
  }
  return `${base} GMT`;
}

function isUpcoming(value) {
  const date = toDate(value);
  return date ? date.getTime() >= Date.now() : false;
}

function dateInput(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* -------------------------------------------------------------------------- */
/* HTML                                                                        */
/* -------------------------------------------------------------------------- */

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5',
    'strong', 'b', 'em', 'i', 'u', 's', 'small',
    'ul', 'ol', 'li', 'blockquote', 'cite',
    'a', 'figure', 'figcaption', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    div: ['class'],
    span: ['class'],
    p: ['class'],
    h2: ['class'],
    h3: ['class'],
    '*': ['class']
  },
  allowedClasses: {
    p: ['lede', 'eyebrow'],
    div: ['lede'],
    span: ['lede']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
  }
};

function sanitizeContent(html) {
  return sanitizeHtml(String(html || ''), SANITIZE_OPTIONS);
}

/** Allow only inline emphasis in headings (admin-authored). */
function inline(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: ['em', 'i', 'strong', 'b', 'br'],
    allowedAttributes: {}
  });
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

function paragraph(html) {
  return sanitizeContent(html);
}

function active(target, current) {
  const want = String(target || '').split(/[?#]/)[0];
  const here = String(current || '').split(/[?#]/)[0];

  if (!want || !want.startsWith('/') || !here) return '';

  const clean = (value) => (value.length > 1 ? value.replace(/\/+$/, '') : '/');
  const wanted = clean(want);
  const actual = clean(here);

  if (wanted === '/') return actual === '/' ? 'is-active' : '';
  return actual === wanted || actual.startsWith(wanted + '/') ? 'is-active' : '';
}

function stripDashes(value) {
  return String(value == null ? '' : value)
    .replace(/(\d)\s*[\u2014\u2013]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[\u2014]\s*/g, ', ')
    .replace(/\s*[\u2013]\s*/g, ' to ')
    .replace(/&mdash;/g, ', ')
    .replace(/&ndash;/g, ' to ')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Read a JSON array setting (a repeatable block). Always returns an array, so
 * a half-written or legacy value can never break a page.
 */
function jsonList(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

/** The string rows of a JSON list, e.g. ["a", {text: "b"}] -> ["a", "b"]. */
function jsonTexts(value, field = 'text') {
  return jsonList(value)
    .map((row) => (typeof row === 'string' ? row : row && row[field]))
    .map((row) => String(row || '').trim())
    .filter(Boolean);
}

module.exports = {
  slugify,
  stripHtml,
  truncate,
  readingTime,
  initials,
  isEmail,
  formatDate,
  formatTime,
  formatDateTime,
  eventWhen,
  isUpcoming,
  dateInput,
  sanitizeContent,
  cleanText,
  active,
  paragraph,
  inline,
  stripDashes,
  jsonList,
  jsonTexts,
  icon: icons.icon,
  logoMark: icons.logoMark
};
