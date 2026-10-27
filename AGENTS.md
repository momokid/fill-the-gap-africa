# Fill The Gap Africa — agent notes

Loaded automatically for any session whose working directory is this project.
Keep it small: every line is billed on every request.

## What this is

Public website plus private content studio for Fill The Gap Africa, a women-led
Ghanaian NGO. Node.js + Express + EJS + `sql.js`, **no native dependencies**, so
it deploys on cPanel "Setup Node.js App" (Passenger). No build step.

## Run and verify

```powershell
npm install
npm start                                            # PORT from .env (8090)
npm test                                             # 26 route tests, temp DB
$env:TEST_BASE='http://127.0.0.1:8090'; npm run smoke
```

- Public: http://localhost:8090 · Studio: http://localhost:8090/ftga-studio
- `/admin` returns 404 on purpose; never hard-code `/admin` in redirects.
- `data/site.db` + `public/uploads/` are the live data. Never delete them.
- `node --test test/` fails in this sandbox (child-process EPERM). `npm test`
  runs `node test/site.test.js` directly, which works.

## Architecture, in one screen

- `lib/settings-schema.js` — single source of truth for settings tabs, fields,
  repeaters and validation limits. The admin form is generated from it.
- `lib/db.js` — schema, defaults, seed content. A new settings key needs a
  default here; `getSettings()` merges defaults, so no migration is needed.
- `routes/public.js`, `routes/admin.js` — public pages, studio. Admin redirects
  must use `adminUrl(req, ...)`.
- `views/` — EJS. Settings field/row partials in `views/admin/partials/`.
- `public/css/theme.css` (public design system), `public/css/admin.css` (studio).
- `test/site.test.js` — route tests; extend these before changing routes.

## Conventions

- Every user-visible string belongs in a setting, not in a template.
- Escape with `<%= %>`; headings allow `<em>` only, via `h.inline()`.
- Public design: 16px minimum type, flat surfaces, 1px borders, no gradients,
  logo blue + heart red. Respect it.
- No new npm dependencies unless explicitly asked.
- Repeaters store JSON in `settings`; empty block = section hidden.
- Column types: `text`, `textarea`, `lines` (one item per line), `select`,
  `image` (path), `link` (path/https/mailto/tel, or the `mailto` token).

## Working cheaply

A previous session burned ~35M input tokens: 207 model calls, each re-sending a
~200k context. The cost of a step is the size of the conversation.

- One task per session. Finish, write the session note, start fresh.
- Ask for or pick a bounded scope. "Continue the project" runs for hours.
- Read narrowly: `grep` + `read` with offset/limit beats whole-file reads
  (`db.js` is 770 lines, `admin.js` 1,200).
- Verify with HTTP/HTML assertions. Avoid screenshots unless visual judgement is
  required — images stay in context and are re-billed on every later step.
- Batch independent tool calls; each round trip re-bills the history.
- Delegate broad exploration to a subagent; only its summary returns.

## Session protocol

1. If `AGENTS.local.md` exists, it is the current session brief (auto-loaded).
   Replace its contents at the start of each session.
2. If `docs/sessions/` has a note newer than this file, read the newest one.
3. Do the scoped work; run `npm test` before claiming it is done.
4. Add `docs/sessions/YYYY-MM-DD-<topic>.md`: what changed, decisions, open
   questions (10–20 lines, not an essay).
5. Never leave the dev server dirty: restart it if routes or settings changed.
