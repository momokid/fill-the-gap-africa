# Fill The Gap Africa — website & content studio

A complete website and admin CMS for **Fill The Gap Africa**, a women-led Ghanaian
non-profit working across education, enterprise, health and climate.

Built on Node.js with **no native dependencies**, so it installs cleanly on shared
cPanel hosting through *Setup Node.js App* (Phusion Passenger).

---

## What is included

**Public website**

| Page | URL |
| --- | --- |
| Home (hero, numbers, mission, programs, approach, field story, partners, stories, events) | `/` |
| About (story, values, approach, team, partners) | `/about` |
| Programs overview | `/programs` |
| Program detail | `/programs/:slug` |
| Impact | `/impact` |
| Get involved (give / volunteer / partner, open needs, FAQ) | `/get-involved` |
| Donate (mobile money, bank transfer, international giving) | `/donate` |
| Contact (form, direct lines, map) | `/contact` |
| Stories / blog index | `/stories` |
| Story detail | `/stories/:slug` |
| Events index (upcoming + past) | `/events` |
| Event detail | `/events/:slug` |
| Any extra page created in the admin | `/:slug` |
| Search | `/search?q=` |
| Sitemap & robots | `/sitemap.xml`, `/robots.txt` |

**Admin studio | `/ftga-studio`**

- Dashboard with counts and recent activity
- **Posts** and **Events** (draft/publish, scheduling, cover image, rich text)
- **Pages** with selectable layout templates (About, Impact, Donate, Contact, …)
- **Programs** with icons, ordering, cover images
- **Team** profiles (photo or elegant initials tile)
- **Media library** (upload, copy URL, delete)
- **Messages** inbox for contact-form enquiries
- **Site settings**: identity, homepage hero, numbers, calls to action, contact details, social links, giving details
- **Page content**: every text block on the About, Impact and Get involved pages, the homepage steps and field story, plus repeatable cards (values, photo strip, results, open needs, FAQ, contact subjects)
- **Design studio**: body and heading fonts, base font size (16-24px), brand and action colours, content width, section spacing, corner radius, homepage section visibility, partners with optional links
- **Users & roles**: admins (everything), editors (content only), readers (dashboard and messages, read-only)
- Account & password management

**Private admin URL:** the studio lives at /ftga-studio by default. Change it under Settings > Security (at least 6 characters, letters, numbers and hyphens). The old URL stops working immediately. You can also set ADMIN_PATH in .env for the first start.

**Typography:** every public page uses a 16px minimum font size. The base size in
Design scales the whole site from 16px to 24px.

**Built in:** CSRF protection, signed cookie sessions, login throttling, sanitised
rich text, safe image uploads, SEO title/description/Open Graph, JSON-LD,
accessible markup, reduced-motion support, print styles.

---

## Local setup

Requirements: **Node.js 18 or newer** (tested on Node 24).

```bash
cd ngo-site
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start
```

Open <http://localhost:3000>. The admin is at <http://localhost:3000/ftga-studio>.
The port comes from `PORT` in `.env`; if you set another value there, use that
port instead. This workspace's `.env` uses `PORT=8090`, so the site is at
<http://localhost:8090>.

First-run sign-in:

```
Email:    admin@fillthegapafrica.org
Password: ChangeMe123!
```

Change this password immediately at **Admin → Your account**. You can set a
different first administrator in `.env` before the first start (the account is
created only when the database is empty).

On first start the app creates `data/site.db` and seeds the site with pages,
programs, team members, three field notes, two events and all settings.

---

## Admin guide

- **Write a story** → Posts → New post. The summary is used on cards and in search
  results; the body is written in the editor. Save as draft until it is ready.
- **Announce an event** → Posts → New event. Set start/end and location; upcoming
  events automatically appear on `/events` and on the homepage.
- **Edit a page** → Pages. Layout templates add the sections (team grid, donation
  details, contact form). Reserved pages keep their URL so links never break.
- **Change the homepage** → Settings → Homepage. Headline, intro, floating card,
  four numbers, the three "how we work" steps, the field story (place label,
  paragraphs, checklist, button) and every section heading.
- **Edit the About page** → Settings → About page. Values cards, the three photo
  strip images, the "at a glance" facts and the team section copy. The page header
  and main body live under Pages → About.
- **Edit Impact and Get involved** → Settings → Impact page / Get involved. Result
  cards, accountability steps, open needs and FAQ entries are all repeatable
  blocks: add, remove and reorder by editing the rows.
- **Update contact or giving details** → Settings → Contact / Giving, including the
  form heading, button label, thank-you message, enquiry subjects and map caption.
- **Add photos** → Media, then choose a cover image on a post, program or team
  member. Images are also stored under `public/uploads`.
- **Enquiries** → Messages. Every message is stored even when email delivery is
  not configured.

Rich text supports headings, bold, italic, lists, quotes and links. Content is
sanitised on save, so pasted markup cannot break the design.

**What is still designed in code.** The three large cards at the top of
`/get-involved` (give / volunteer / partner) and the donation page's structure are
part of the layout. Everything around them — headings, open needs, FAQ, giving
details, contact labels — is editable. Edit the cards in
`views/get-involved.ejs` if their wording needs to change.

---

## Tests

```bash
npm test
```

Runs the route suite in `test/site.test.js` against a throwaway database in the
system temp folder — it never touches `data/site.db` or `public/uploads/`. It
covers the public pages, the private admin path, login, CSRF, role permissions,
settings round-trips (including the repeatable blocks), admin redirects, the
contact form and changing the admin path.

To check a running instance instead:

```bash
$env:TEST_BASE='http://127.0.0.1:8090'   # PowerShell
npm run smoke
```

---

## Deploying on cPanel

cPanel must offer **Setup Node.js App** (Phusion Passenger). Most shared hosts do;
if yours does not, ask the host to enable Node.js support.

### Automated deploys (GitHub → cPanel)

`.github/workflows/ci-cd.yml` tests every push and pull request on Node 22 and 24.
A push to `master` that passes the tests is pushed to the cPanel-managed Git
repository, whose post-receive hook runs `.cpanel.yml`: it syncs the code, runs
`npm ci --omit=dev` inside the cPanel Node virtualenv and restarts Passenger.
Live `.env`, `data/site.db` and `public/uploads/` are never touched.

See [docs/deploy-cicd.md](docs/deploy-cicd.md) for the one-time setup (Node.js app,
cPanel Git repository, SSH deploy key, GitHub secrets), rollback and
troubleshooting. The manual steps below are the first-time server setup and the
fallback if Actions is unavailable.

### Manual deployment

1. **Upload the code**
   Upload the project ZIP to the folder that will hold the app (for example
   `/home/USER/fillthegap-africa-site`) and extract it. Do **not** upload
   `node_modules`; you will install it on the server.

2. **Create the application**
   cPanel → *Setup Node.js App* → *Create Application*.
   - Node.js version: 20, 22 or 24
   - Application mode: **Production**
   - Application root: the folder from step 1
   - Application URL: your domain or subdomain (use the domain root, not a subfolder)
   - Application startup file: **`app.js`**

3. **Install dependencies**
   Click **Run NPM Install** in the Node.js app panel. (Or, from the terminal:
   `source /home/USER/nodevenv/<app>/<version>/bin/activate && npm install`.)

4. **Configure the environment**
   Create a `.env` file in the application root (copy `.env.example`). At minimum:
   ```ini
   NODE_ENV=production
   BASE_URL=https://your-domain.com
   SESSION_SECRET=<a long random string>
   ADMIN_EMAIL=you@your-domain.com
   ADMIN_PASSWORD=<a strong first password>
   COOKIE_SECURE=true
   ```
   Generate a secret:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. **Permissions**
   Make sure the app can write to `data/` and `public/uploads/`.
   In File Manager set both to `755` (or `775` if the group needs it). The
   SQLite file `data/site.db` is created on first start.

6. **Restart and visit**
   Click **Restart** in the Node.js panel, then open your domain. Sign in at
   `/ftga-studio` and change the password.

7. **Email (optional)**
   Add the SMTP settings to `.env` to receive contact-form notifications and
   automatic acknowledgements. Without SMTP, messages are still saved in the
   admin inbox.

### Notes for cPanel

- Use a domain or subdomain **at the root** of the application URL. The site uses
  absolute paths (`/css/…`), so a subfolder URL such as
  `example.com/site` would need extra configuration.
- Do not enable multiple Node processes: the SQLite database is written by a
  single process. Passenger's default single-worker mode is correct.
- Upgrades: push to `master` and let Actions deploy, or replace the code, run
  `npm install` again, keep `data/` and `public/uploads/`, then restart.
- cPanel's Passenger loads `app.js` as a module and does not provide `PORT`.
  `app.js` detects `IN_PASSENGER` and calls `listen('passenger')`; keep that
  block, or Passenger returns “Web application could not be started”.
- If the app shows *503* after deployment, check the Node.js app log in cPanel;
  the usual causes are a missing `.env`, a wrong startup file, or a Node version
  below 18.

---

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | development | Set to `production` on the server |
| `PORT` | `3000` | Local port; under Passenger the app uses its socket instead |
| `BASE_URL` | request host | Public site URL, used for canonical links, sharing and sitemap |
| `SESSION_SECRET` | insecure default | **Set this.** Signs session cookies |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | see above | First administrator, created once |
| `DATA_DIR` | `./data` | Where `site.db` lives |
| `UPLOAD_DIR` | `./public/uploads` | Where images are stored |
| `MAX_UPLOAD_MB` | `8` | Upload size limit |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | empty | Optional mail delivery |
| `MAIL_FROM` / `MAIL_TO` | empty | Sender and notification recipient |
| `TZ` | `Africa/Accra` | Display timezone |

---

## Backups

Everything that changes is in two places:

- `data/site.db` — all pages, posts, events, programs, team, messages and settings
- `public/uploads/` — uploaded images

Download both regularly (cPanel File Manager, or a scheduled backup). To restore,
put them back and restart the app.

To start over with fresh demo content, stop the app, delete `data/site.db`, and
restart. **This deletes all content.**

---

## Security checklist before launch

- [ ] `SESSION_SECRET` set to a long random value
- [ ] `NODE_ENV=production` and `COOKIE_SECURE=true`
- [ ] Administrator password changed from the default
- [ ] `ADMIN_PASSWORD` removed from `.env` once the account exists (optional)
- [ ] HTTPS enabled (AutoSSL / Let's Encrypt in cPanel)
- [ ] `data/` and `public/uploads/` not listed publicly (they are outside the web root the app serves; Express only serves `public/`)
- [ ] Backups scheduled

---

## Project structure

```
.github/workflows/ci-cd.yml  Tests, then deploys master to cPanel
.cpanel.yml            cPanel deployment tasks (sync, install, restart)
app.js                 Express bootstrap, middleware, error handling
config.js              Environment configuration
lib/db.js              SQLite (sql.js) storage, schema, demo seed
lib/auth.js            Password hashing, sessions, login throttling
lib/csrf.js            CSRF tokens
lib/helpers.js         Dates, sanitising, icons, formatting
lib/icons.js           Inline SVG icon set and logo
lib/upload.js          Multer image uploads
lib/mail.js            Optional SMTP notifications
lib/settings-schema.js Settings studio schema: tabs, fields, repeaters, limits
routes/public.js       Public website routes
routes/admin.js        Admin CMS routes
views/                 EJS templates (public + admin)
public/css/theme.css   Design system
public/css/admin.css   Content studio styles
public/js/theme.js     Navigation, copy buttons, back-to-top
public/js/admin.js     Rich text editor, repeatable rows, admin behaviour
public/uploads/        Uploaded images
data/site.db           SQLite database (created at runtime)
test/site.test.js      Route tests for the site and the studio
scripts/smoke-test.js  End-to-end check of a running instance
docs/deploy-cicd.md    CI/CD setup, rollback and troubleshooting
```

---

## Customising the design

- Colours and type scale: CSS variables at the top of `public/css/theme.css`
- Logo mark: `logoMark()` in `lib/icons.js` (also `public/img/favicon.svg`)
- Homepage copy: Admin → Settings → Homepage
- Page copy and cards: Admin → Settings → About page / Impact page / Get involved
- Program icons: Admin → Programs → Icon
- New settings field: declare it once in `lib/settings-schema.js`, seed a default in
  `lib/db.js`, then read `site.<key>` from a view. The admin form, validation and
  allowed-key list follow automatically.

---

## Content provenance

Contact details, founding year (2011), programme figures and the Katiu Saa story
come from Fill The Gap Africa's public Facebook page and published interviews
with its Executive Director, Dr. Vida Kabuga Akekodaga.

**Before publishing:** replace the three sample team profiles (Adwoa, Kwabena,
Efua) with real staff, and confirm the giving details (bank account, Mobile Money
name) with the finance lead. The Mobile Money number shown is the one published
publicly on Facebook.

---

## Troubleshooting

**“Cannot find module …”** — run `npm install` in the application root.

**Uploads fail** — check `public/uploads` permissions and `MAX_UPLOAD_MB`; cPanel
may also impose its own request limits.

**Login does not stick** — if HTTPS is on but `COOKIE_SECURE` is false, cookies
still work; if HTTPS is off but `COOKIE_SECURE=true`, the browser will not store
the session cookie. Match the setting to your protocol.

**Changes do not appear** — restart the Node app from cPanel after replacing files.

**Contact form sends no email** — add SMTP settings; messages are already stored
under Admin → Messages.
