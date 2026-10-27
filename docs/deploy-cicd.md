# CI/CD: GitHub Actions → cPanel

Every push to `master` is tested, pushed to the cPanel-managed Git repository, and
deployed by cPanel's post-receive hook. Live content, uploads and secrets stay on
the server.

```
GitHub push / manual run
        │
        ▼
GitHub Actions: npm ci + npm test (Node 22 and 24)
        │  tests pass
        ▼
SSH push of the tested commit → ~/repositories/<repo> on cPanel
        │  cPanel post-receive hook
        ▼
.cpanel.yml: rsync code → npm ci --omit=dev → touch tmp/restart.txt
        │
        ▼
Health check: GET <SITE_URL>/robots.txt == 200
```

Pull requests run the tests but never deploy. Manual runs deploy only when they
are started from `master`.

## What a deploy changes

| Path | On deploy |
| --- | --- |
| `app.js`, `config.js`, `package*.json`, `.env.example` | Replaced |
| `lib/`, `routes/`, `views/`, `scripts/` | Synced, removed files deleted |
| `public/css/`, `public/js/`, `public/img/` | Synced, removed files deleted |
| `.env` | **Never touched** |
| `data/` (`site.db`) | **Never touched** |
| `public/uploads/` | **Never touched** |
| `node_modules/` | Reinstalled with `npm ci --omit=dev` |
| `tmp/restart.txt` | Touched to restart Passenger |

Back up `data/site.db`, `public/uploads/` and `.env` before the first automated
deploy, as you would before any release.

## One-time setup

Prerequisites: the domain serves the app through cPanel **Setup Node.js App**, SSH
is enabled, and the code is in a GitHub repository whose default branch is `master`.

### 1. Create the Node.js application

cPanel → **Setup Node.js App** → **Create Application**:

- Node.js version: 20, 22 or 24
- Application mode: **Production**
- Application root: `fillthegap-africa-site` (this becomes `~/fillthegap-africa-site`)
- Application URL: the domain root
- Application startup file: `app.js`

Create `.env` in that folder from `.env.example` before going live (see the main
README). The app creates `data/site.db` on first start. The application root name
must match `APP_NAME` in `.cpanel.yml`.

### 2. Create the cPanel-managed Git repository

cPanel → **Git Version Control** → **Create**:

- Repository name: `ngo-site` (any name)
- Clone URL: `ssh://USER@HOST:PORT/home/USER/repositories/ngo-site`

Do **not** use the application root as the repository path; cPanel deploys from
`~/repositories/...` into the app folder. Note the path after the port — it is
the `CPANEL_REPO_PATH` secret. The repository may be empty; the first push creates
the branch and the post-receive hook deploys it.

### 3. Create a deploy key

On your workstation:

```bash
ssh-keygen -t ed25519 -C "github-actions@fillthegapafrica.org" -f cpanel_deploy
```

Accept the default location and **no passphrase** (GitHub Actions cannot type one).

cPanel → **SSH Access** → **Manage SSH Keys** → **Import Key** → paste
`cpanel_deploy.pub` → **Import** → **Manage** → **Authorize**.

Test it from your workstation:

```bash
ssh -i cpanel_deploy -p 22 USER@HOST "git -C /home/USER/repositories/ngo-site symbolic-ref --short HEAD"
```

### 4. Add GitHub secrets and variables

Repository → **Settings** → **Secrets and variables** → **Actions**.

Secrets:

| Name | Value |
| --- | --- |
| `CPANEL_SSH_HOST` | server hostname or IP |
| `CPANEL_SSH_USER` | cPanel username |
| `CPANEL_SSH_KEY` | full contents of `cpanel_deploy` (private key) |
| `CPANEL_REPO_PATH` | `/home/USER/repositories/ngo-site` |
| `CPANEL_SSH_PORT` | optional, default `22` |
| `CPANEL_KNOWN_HOSTS` | optional but recommended: output of `ssh-keyscan -p PORT HOST` |

Variables (not secrets):

| Name | Value |
| --- | --- |
| `SITE_URL` | `https://fillthegapafrica.org` (used for the health check and deployment link) |
| `CPANEL_BRANCH` | optional; the workflow auto-detects the branch cPanel has checked out |

The workflow creates the `production` environment on first use. Add required
reviewers under **Settings → Environments → production** if deploys should need
approval.

### 5. Push `master`

The first push to `master` deploys. Watch **Actions → CI/CD**; the deploy job log
includes the remote post-receive output from cPanel.

## Day-to-day

```bash
git checkout master
git pull
# change files, run npm test
git commit -am "Update ..."
git push
```

Actions tests, then deploys. If the health check fails, the workflow fails but the
code is already on the server — check the cPanel Node.js log and use the manual
steps in the main README to recover.

## Configuration

- App folder: edit `APP_NAME` at the top of `.cpanel.yml` if the Node.js
  application root is not `fillthegap-africa-site`. It is relative to `$HOME`; for
  a subfolder use `apps/site`.
- Branch: the workflow asks cPanel which branch is checked out and pushes there.
  Set the `CPANEL_BRANCH` variable to override.
- Node version: cPanel's virtualenv version is detected with
  `~/nodevenv/$APP_NAME/*/bin/activate`; no version is hard-coded.

## Rollback

Revert and push; the pipeline redeploys the earlier code:

```bash
git revert <bad-commit>
git push
```

The database is not versioned. To restore content, upload a backup of
`data/site.db` and `public/uploads/`, then touch `tmp/restart.txt` (or click
**Restart** in cPanel).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Permission denied (publickey)` | Public key not authorized in cPanel, wrong `CPANEL_SSH_USER`, or wrong port. Re-run the SSH test in step 3. |
| `Host key verification failed` | Host key changed or missing. Refresh `CPANEL_KNOWN_HOSTS` with `ssh-keyscan -p PORT HOST`. |
| `CPANEL_REPO_PATH must be an absolute path` | Use the full path from the cPanel clone URL, starting with `/home/`. |
| Push succeeds, site unchanged | Open the job log: if the hook did not run, the pushed branch is not the one cPanel has checked out. Set `CPANEL_BRANCH`. Confirm `.cpanel.yml` is at the repository root. |
| `No cPanel Node.js virtualenv at ~/nodevenv/...` | `APP_NAME` does not match the application root, or the Node.js app was not created. |
| `rsync is required on the server` | Ask the host to install `rsync` (standard on cPanel/CloudLinux). |
| 503 after deploy | cPanel → Setup Node.js App → log. Usually a missing `.env`, wrong startup file, or an unsupported Node version. |
| Health check fails but the site loads | `SITE_URL` is wrong, or `/robots.txt` is blocked by a proxy/WAF. |
| Deploy times out during `npm ci` | Slow shared host. Retry from **Actions → Run workflow**; if it repeats, replace `npm ci` with `npm install --omit=dev` in `.cpanel.yml`. |

## Security notes

- The deploy key grants SSH access to the cPanel account. Store it only in GitHub
  secrets, never in the repository, and rotate it if exposed.
- `CPANEL_KNOWN_HOSTS` pins the server key and prevents man-in-the-middle hosts.
- The cPanel repository is a deployment target, not a place to commit. The
  workflow force-pushes it so it always mirrors the tested `master` commit.
- Secrets are unavailable to pull requests from forks; the deploy job also requires
  `master` and a successful test job.
