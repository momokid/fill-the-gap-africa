# Mobile nav panel logo

## What changed

- `views/partials/header.ejs`: the logo inside the mobile menu panel
  (`.primary-nav__top`) now uses `site.logo` like the desktop header, falling
  back to `h.logoMark(36)` only when no logo is uploaded.
- `public/css/theme.css`: added `.primary-nav__top .brand-logo { max-height: 36px; }`
  so the panel logo keeps its compact size (the mobile `.brand-logo` bumps to
  46–54px would otherwise enlarge it).

## Verified

- `npm test` — 26/26.
- Live HTML at `/` renders `<img class="brand-logo brand-logo--nav" src="/img/ftga-logo.png">`
  in `primary-nav__top`; `/css/theme.css` serves the new rule.

## Open questions

- None; the panel logo is now derived from the same setting as the header
  logo, so uploading/replacing a logo in the studio updates both.
