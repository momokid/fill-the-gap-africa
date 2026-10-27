# Page content, port, project move — 2026-10-27

## Done
- Fixed the public nav: `h.active()` now emits `is-active` and the templates add
  `aria-current="page"`; CSS had only legacy WordPress classes, so nothing was
  ever highlighted. Active item = brand-soft pill + brand text (desktop), left
  bar in the mobile drawer, bright blue in the footer.
- Fixed studio redirects that hard-coded `/admin` (post/page/program/team/settings
  saves 404'd on `/ftga-studio`). Now via `adminUrl(req, ...)` in `routes/admin.js`.
- `robots.txt` disallows the current admin path; invalid `admin_path` can no longer
  be written by the generic settings loop.
- Added `lib/settings-schema.js` (tabs, fields, repeaters, limits) and repeatable
  blocks for Home/About/Impact/Get involved/Contact. 10 settings tabs total.
- Added `test/site.test.js` (23 route tests) and rewrote the smoke test.
- Port 8090 pinned in `.env`; project moved from OneDrive to `E:\project\ngo-site`.
- Rebuilt `fill-the-gap-africa-site.zip` (excludes `.env`, logs).

## Decisions
- Settings schema over per-page JSON blocks: one declaration drives form,
  validation and key allow-list; no migration needed for new keys.
- Empty repeater hides its section rather than rendering an empty shell.
- Images in repeaters are paths (validated), not uploads — upload stays in Media.
- Route tests run in-process with `node test/site.test.js`; `node --test` spawns
  children and hits EPERM in this sandbox.

## Open
- Get involved top cards and donate page internals are still template-level.
- No row reordering or per-row image upload in repeaters.
- WordPress theme is unused and still in the old OneDrive workspace.
- Session cost: ~35M input tokens for 207 steps — see "Working cheaply" in
  `AGENTS.md`; keep future sessions scoped and start fresh per task.
