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
- Live host values are not configured yet: cPanel user/host, repo path, deploy
  key, `SITE_URL`, and the GitHub origin remote. First real deploy is untested.
- `APP_NAME` in `.cpanel.yml` assumes the app root is `fillthegap-africa-site`.
- Back up `data/site.db`, `public/uploads/` and `.env` before the first deploy.
