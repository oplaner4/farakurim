---
name: farnost-deploy
description: Release the new farakurim.cz site - upload the staged uploads/ files with rsync over SSH, bump the version in package.json, tag it vX.Y.Z and push, so GitHub Actions deploys out/ to 2026.farakurim.cz; always after the user's explicit confirmation. Use at the end of farnost-publish-content, or whenever the user asks to deploy, upload, publish to the server or sync the site over SFTP/rsync.
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

## Release: a version tag deploys `out/`

`.github/workflows/build-and-deploy.yml` checks and builds every push. Pushes to `main` are only a backup (the `main` push of a
`chore(release): v…` commit is skipped: its tag run checks the same commit); the site is deployed
when a **release tag** `vX.Y.Z` is pushed. The tag must equal `version` in `package.json` and point to a commit on
`main`, or the run stops. Actions cannot upload `uploads/` (not in git), and it **stops before syncing** if the
build links a `/uploads/…` file that is not on the server yet. So a release is:

1. **Clean state.** `git status --short` must be empty (also no `AGENTS.md` re-added by `next dev`: ask the user to
   commit or discard it), on `main`, not behind `origin/main` (`git fetch && git status -sb`). Otherwise stop.
2. **Upload the staged files:** steps 2–4 below for the `uploads/` command only (skip when `uploads/` is empty).
3. **Pick the version.** List the commits since the last release (`git log --oneline $(git describe --tags
--abbrev=0 2>/dev/null)..HEAD`, or all of them before the first release). `patch` for content and fixes, `minor` when
   a `feat` outside the `content` scope is among them, `major` only when the user asks (e.g. the switch to
   `/farakurim.cz/`). Tell the user the commits and the version, and ask for a yes: it publishes the site.
4. **Bump and tag.** `pnpm version <patch|minor|major> -m "chore(release): v%s"` sets `package.json`, commits it
   (a valid commitlint message) and creates the annotated tag `vX.Y.Z`. It refuses a dirty tree.
5. **Push** both: `git push origin main --follow-tags`, unless the user pushes it. Then watch the run in the repo's
   Actions tab and check the changed pages (step 5 below).

A failed run (a check, a missing upload) is fixed in a new commit and released with a new version; never move or
reuse a pushed tag.

The deploy job reads the `Production` environment: `DEPLOY_SSH_KEY` (secret, a private key the server accepts) and
`DEPLOY_KNOWN_HOSTS` (the server's line from `ssh-keygen -F 91.239.200.63`, fingerprint checked), and the optional
variable `CHECK_UPLOADS`: `false` skips the linked-uploads check (with a warning); unset or anything else keeps it on.
The build job has no environment, so `GOOGLE_CALENDAR_API_KEY` is a repository variable (it is public in the built JS
anyway). Deploying `out/` locally with the commands below still works, as a fallback when Actions is down.

**Keep the workflow and this skill in sync.** Both hold the SSH target, the web root, the `out/` rsync flags with
its three excludes and the verify checks. When you change one (a new server-only folder, the switch to
`/farakurim.cz/`, other flags), change the other in the same commit.

## 1. Preconditions

- `/2026.farakurim.cz/virtualni_prohlidka/` exists on the server (`ssh farakurim_cz@91.239.200.63 'ls
/2026.farakurim.cz/virtualni_prohlidka/index.php'`). If not, offer the one-time copy in
  [Virtual tour setup](#virtual-tour-setup) first; the deploy itself works without it, only the footer link 404s.

- Only for the local `out/` fallback: `out/` comes from a fresh `pnpm build` of the current commit with `.env.local`
  in place (without the key the calendars ship mock data). The usual flow needs no local build: Actions builds.
- The work is committed (`git status --short` is empty).

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
