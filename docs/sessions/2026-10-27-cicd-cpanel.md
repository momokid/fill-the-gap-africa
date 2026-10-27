# CI/CD to cPanel — 2026-10-27

## Done
- `.github/workflows/ci-cd.yml`: tests on Node 22 and 24, then deploys `master`
  (or a manual run from `master`) by SSH force-pushing the tested commit to the
  cPanel-managed Git repository. Pull requests test only. Health check hits
  `<SITE_URL>/robots.txt` after the push.
- `.cpanel.yml`: cPanel post-receive tasks copy only code directories, copy the
  top-level code files, run `npm ci --omit=dev` in the detected
  `~/nodevenv/<APP_NAME>/*` virtualenv, chmod `data/` + uploads, and touch
  `tmp/restart.txt` for Passenger.
- Pinned LF endings in `.gitattributes` for YAML/JS/EJS; ignored local agent
  scratch files. Initialized the repo and made the first commit.
- `docs/deploy-cicd.md`: one-time setup (Node app, cPanel repo, deploy key,
  secrets/variables), rollback, troubleshooting. README links it; manual cPanel
  steps kept as fallback.
- Deployed to `fillthegapafrica.org` at `1d83373`: home and sitemap return 200,
  studio redirects to login (302), robots serves the real app.
- Two host-specific fixes: cPanel has no `rsync` (deploy uses `rm` + `cp`), and
  Passenger loads `app.js` as a module with no `PORT`. The app now starts when
  required and listens on `'passenger'`; without both, Passenger returned
  “Web application could not be started”.

## Decisions
- Chose cPanel push deployment instead of rsync-over-SSH: cPanel's post-receive
  hook runs `.cpanel.yml`, so the workflow needs no remote shell scripts.
- The app root is a whitelist copy, not a delete-everything sync, so
  `.env`, `data/site.db`, uploads and host-specific files cannot be removed.
- The workflow force-pushes because GitHub `master` is the source of truth and the
  cPanel repo is a deploy target.
- No third-party GitHub actions for SSH; plain OpenSSH and git keep the supply
  chain small.

## Open
- GitHub `master` is behind cPanel by the rsync/Passenger commits; push them so
  the next Actions run (a no-op deploy) exercises the full pipeline.
- Change the first admin password and add SMTP details in `.env`.
- Back up `data/site.db`, `public/uploads/` and `.env`; the site now holds live
  content created by the first start.
