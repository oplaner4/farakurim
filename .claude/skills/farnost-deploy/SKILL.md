---
name: farnost-deploy
description: Deploy the new farakurim.cz site to the web host with rsync over SSH - upload the staged uploads/ files and the built out/ to 2026.farakurim.cz, after a dry run and the user's explicit confirmation. Use at the end of farnost-publish-content, or whenever the user asks to deploy, upload, publish to the server or sync the site over SFTP/rsync.
---

# Deploy to the server

The hosting (cesky-hosting.cz) gives SSH access with key auth (`~/.ssh` already has the key) and has `rsync` on
both ends. The new site lives in its own web root until it replaces the old one:

| What                   | Value                                                         |
| ---------------------- | ------------------------------------------------------------- |
| SSH login              | `farakurim_cz@91.239.200.63`                                  |
| Web root (new site)    | `/2026.farakurim.cz/`, served at http://2026.farakurim.cz/    |
| Live old site (PHP)    | `/farakurim.cz/`: **never** deploy there, `--delete` wipes it |
| Uploaded files on host | `/2026.farakurim.cz/uploads/`, mirrored locally by `uploads/` |
| Virtual tour           | `/2026.farakurim.cz/virtualni_prohlidka/`, on the server only |
| Bible quote cache      | `/2026.farakurim.cz/cache/`, written by `biblicky-citat.php`  |

The subdomain has no TLS certificate yet, so check it over `http://`. Switching the new site to `/farakurim.cz/`
is a separate decision: it changes this skill (and the `LIVE` URL in `scripts/preview.py` and
`scripts/dev-server.mjs`).

Three folders in the web root are **not** in `out/` and must survive every deploy, so both `out/` commands exclude
them: `/uploads/`, `/virtualni_prohlidka/` (the old site's Lapentor tour, 553 MB of PHP + panoramas, linked from
the footer) and `/cache/` (the last "Slovo na dnešek" verse, its fallback while vira.cz is down). Never sync `out/`
without all three excludes.

## GitHub Actions deploys `out/`

`.github/workflows/deploy.yml` builds every push and, on a push to `main`, syncs `out/` to the web root with the
same excludes. It cannot upload `uploads/` (not in git), and it **stops before syncing** if the build links a
`/uploads/…` file that is not on the server yet. So the usual deploy is:

1. Upload the staged files: steps 2–4 below for the `uploads/` command only (skip when `uploads/` is empty).
2. Push `main` (`git push`): ask the user first, a push to `main` publishes the site. Then watch the run in the
   repo's Actions tab and check the changed pages (step 5).

The deploy job reads the `Production` environment: `DEPLOY_SSH_KEY` (secret, a private key the server accepts) and
`DEPLOY_KNOWN_HOSTS` (the server's line from `ssh-keygen -F 91.239.200.63`, fingerprint checked). The build job has
no environment, so `GOOGLE_CALENDAR_API_KEY` is a repository-level secret or variable. Deploying
`out/` locally with the commands below still works, as a fallback when Actions is down.

**Keep the workflow and this skill in sync.** Both hold the SSH target, the web root, the `out/` rsync flags with
its three excludes and the verify checks. When you change one (a new server-only folder, the switch to
`/farakurim.cz/`, other flags), change the other in the same commit.

## 1. Preconditions

- `/2026.farakurim.cz/virtualni_prohlidka/` exists on the server (`ssh farakurim_cz@91.239.200.63 'ls
/2026.farakurim.cz/virtualni_prohlidka/index.php'`). If not, offer the one-time copy in
  [Virtual tour setup](#virtual-tour-setup) first; the deploy itself works without it, only the footer link 404s.

- `out/` comes from a fresh `pnpm build` of the current commit with `.env.local` in place (without the key the
  calendars ship mock data). When in doubt, rebuild.
- The work is committed (`git status --short` is empty, apart from `AGENTS.md` re-added by `next dev`).

## 2. Dry run

Run both from the repo root, `-n` only shows what would happen:

```sh
rsync -azn --itemize-changes --ignore-existing --chmod=D755,F644 \
  uploads/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/uploads/
rsync -azn --itemize-changes --delete --exclude=/uploads/ --exclude=/virtualni_prohlidka/ --exclude=/cache/ --chmod=D755,F644 \
  out/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/
```

- `uploads/`: `--ignore-existing` and no `--delete`, so files already on the server are never overwritten or
  removed. The server's `/uploads/` is the only copy of earlier uploads.
- `out/`: `--delete` keeps the web root equal to the build (stale pages and old `_next/` chunks go); the two
  excludes protect the uploaded files and the virtual tour from it. `out/.htaccess` (from `public/`) makes Apache
  serve `404.html` for missing URLs.

Summarise the dry run for the user in one short block: the new uploads (paths), and for `out/` the number of
files sent and **every** file to be deleted (lines starting with `*deleting`). Hidden noise: `.d..t......` lines
are directory timestamps only.

## 3. Confirm

Deploying publishes the site, so ask the user explicitly, for example:

> Nasadit na http://2026.farakurim.cz/? (N nových souborů v /uploads/, M souborů webu, K ke smazání)

Wait for a clear yes. Without it, stop here: the build and commit stay as they are.

## 4. Deploy

The same two commands without `-n`, **uploads first**, so no deployed page links a file that is not there yet:

```sh
rsync -az --ignore-existing --chmod=D755,F644 \
  uploads/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/uploads/
rsync -az --delete --exclude=/uploads/ --exclude=/virtualni_prohlidka/ --exclude=/cache/ --chmod=D755,F644 \
  out/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/
```

On an error, report rsync's output and stop; rerunning is safe (rsync only sends what differs).

## 5. Verify

```sh
curl -sI http://2026.farakurim.cz/ | head -1
curl -sI 'http://2026.farakurim.cz/uploads/<path>' | head -1   # each new upload
curl -s -o /dev/null -w '%{http_code}\n' http://2026.farakurim.cz/neexistuje/   # 404, the Czech 404 page
curl -sI http://2026.farakurim.cz/virtualni_prohlidka/ | head -1
```

Every URL returns `200` (except the `404` check); also check the changed pages (e.g. `/aktuality/<slug>/`). Report
the result in one line. Leave `uploads/` as it is: `--ignore-existing` skips what is already on the server.

## Virtual tour setup

One time only, when the tour is missing on the server. It copies the old site's folder on the server, so nothing is uploaded:

```sh
ssh farakurim_cz@91.239.200.63 'cp -a /farakurim.cz/virtualni_prohlidka /2026.farakurim.cz/'
```

Ask the user before running it, like a deploy. The tour is a self-contained PHP app (`index.php` reads `db.json`, no
database) that builds its URLs from the request, so it runs unchanged on any host. Do not edit its files; its
`.htaccess` sends misses to `/errors/404`, which ends on the site's 404 page.
