'use strict';

/**
 * Inline SVG icon set. Stroke icons inherit the current text colour so they
 * work on light and dark surfaces without extra assets.
 */

const STROKE = {
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H5M11 18l-6-6 6-6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M9 7h8v8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.6 6.4 8.4 6 8.4-6"/>',
  phone:
    '<path d="M6.6 3.5h3l1.6 4.1-2.1 1.5a12.4 12.4 0 0 0 5.8 5.8l1.5-2.1 4.1 1.6v3a2 2 0 0 1-2.2 2A17.4 17.4 0 0 1 3.5 5.7a2 2 0 0 1 2-2.2z"/>',
  pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  heart:
    '<path d="M12 20.5S3.5 15.4 3.5 9.6A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.5 3.3c0 5.8-8.5 10.9-8.5 10.9z"/>',
  book:
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  briefcase:
    '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7"/><path d="M3 12.5h18"/>',
  bank: '<path d="M3.5 9.5 12 4l8.5 5.5"/><path d="M6 10v7.5M10 10v7.5M14 10v7.5M18 10v7.5"/><path d="M3.5 20.5h17"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H5.5A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15"/>',
  pulse: '<path d="M3 12h3.5l2.2-5.5L12.5 17l2.3-5H21"/>',
  leaf:
    '<path d="M20.5 3.5C9 3.5 3.5 8 3.5 14.2a5.8 5.8 0 0 0 5.8 5.8c6.3 0 11.2-5.5 11.2-16.5z"/><path d="M4 20C6.5 13.5 11 10 17 8"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0"/><path d="M16.2 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.6 14.2a6.2 6.2 0 0 1 3.6 5.3"/>',
  globe:
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5z"/>',
  download: '<path d="M12 3v12M7 10.5l5 5 5-5"/><path d="M4 20h16"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  spark: '<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  shield: '<path d="m12 21s7-3.2 7-9V5.8L12 3 5 5.8V12c0 5.8 7 9 7 9z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  external:
    '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  quote:
    '<path d="M9 6C5.7 7.4 4 9.7 4 13v5h6v-6H7c0-2.2.8-3.6 2.8-4.6zM20 6c-3.3 1.4-5 3.7-5 7v5h6v-6h-3c0-2.2.8-3.6 2.8-4.6z"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 16-5-5L5 20"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 7.5l2 1.2M17.5 15.3l2 1.2M4.5 16.5l2-1.2M17.5 8.7l2-1.2"/>',
  inbox:
    '<path d="M3.5 13.5 6 4h12l2.5 9.5V20h-17z"/><path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/>',
  logout: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M8 12h10"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/>'
};

const FILLED = {
  facebook:
    '<path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.25-1.5 1.55-1.5H16.6V4.3c-.28-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9v2.32H8v3h2.52V21h2.98z"/>',
  instagram:
    '<path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 3.05a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5zm0 11.13a4.38 4.38 0 1 1 0-8.76 4.38 4.38 0 0 1 0 8.76zm7.02-11.4a1.58 1.58 0 1 1-3.16 0 1.58 1.58 0 0 1 3.16 0z"/>',
  linkedin:
    '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21h-4z"/>',
  x: '<path d="M17.7 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.9 21H1.7l7.5-8.6L1.3 3h6.6l4.5 5.6L17.7 3zm-1.1 16.2h1.8L7.4 4.7H5.5l11.1 14.5z"/>',
  youtube:
    '<path d="M21.6 7.2s-.2-1.4-.8-2c-.75-.8-1.6-.8-2-.85C16 4.2 12 4.2 12 4.2h-.01s-4 0-6.8.15c-.4.05-1.24.05-2 .85-.6.6-.8 2-.8 2S2.2 8.9 2.2 10.6v1.6c0 1.7.19 3.4.19 3.4s.2 1.4.8 2c.76.8 1.75.77 2.2.86 1.6.15 6.6.2 6.6.2s4 0 6.8-.16c.4-.05 1.25-.05 2-.85.6-.6.8-2 .8-2s.19-1.7.19-3.4v-1.6c0-1.7-.19-3.4-.19-3.4zM9.9 14.6V8.9l5.4 2.86-5.4 2.84z"/>'
};

function icon(name, size = 20, className = '') {
  const s = parseInt(size, 10) || 20;
  const classes = `icon icon--${name} ${className}`.trim();

  if (FILLED[name]) {
    return `<svg class="${classes}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${FILLED[name]}</svg>`;
  }

  if (STROKE[name]) {
    return `<svg class="${classes}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${STROKE[name]}</svg>`;
  }

  return '';
}

function logoMark(size = 42) {
  const s = parseInt(size, 10) || 42;
  return `<svg class="brand-mark" width="${s}" height="${s}" viewBox="0 0 40 40" role="img" aria-label="Fill The Gap Africa">
    <rect width="40" height="40" rx="9" fill="#FF6600"/>
    <rect x="7.5" y="23" width="8" height="9.5" rx="1.6" fill="#FFFFFF"/>
    <rect x="24.5" y="23" width="8" height="9.5" rx="1.6" fill="#FFFFFF"/>
    <path d="M11.5 24c0-8 4-13 8.5-13s8.5 5 8.5 13" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="20" cy="24" r="1.8" fill="#FFFFFF"/>
  </svg>`;
}

module.exports = { icon, logoMark, STROKE, FILLED };
