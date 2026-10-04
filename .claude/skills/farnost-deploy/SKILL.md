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

The subdomain has no TLS certificate yet, so check it over `http://`. Switching the new site to `/farakurim.cz/`
is a separate decision: it changes this skill (and the `LIVE` URL in `scripts/preview.py` and
`scripts/dev-server.mjs`).

## 1. Preconditions

- `out/` comes from a fresh `pnpm build` of the current commit with `.env.local` in place (without the key the
  calendars ship mock data). When in doubt, rebuild.
- The work is committed (`git status --short` is empty, apart from `AGENTS.md` re-added by `next dev`).

## 2. Dry run

Run both from the repo root, `-n` only shows what would happen:

```sh
rsync -azn --itemize-changes --ignore-existing --chmod=D755,F644 \
  uploads/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/uploads/
rsync -azn --itemize-changes --delete --exclude=/uploads/ --chmod=D755,F644 \
  out/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/
```

- `uploads/`: `--ignore-existing` and no `--delete`, so files already on the server are never overwritten or
  removed. The server's `/uploads/` is the only copy of earlier uploads.
- `out/`: `--delete` keeps the web root equal to the build (stale pages and old `_next/` chunks go), and
  `--exclude=/uploads/` protects the uploaded files from it.

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
rsync -az --delete --exclude=/uploads/ --chmod=D755,F644 \
  out/ farakurim_cz@91.239.200.63:/2026.farakurim.cz/
```

On an error, report rsync's output and stop; rerunning is safe (rsync only sends what differs).

## 5. Verify

```sh
curl -sI http://2026.farakurim.cz/ | head -1
curl -sI 'http://2026.farakurim.cz/uploads/<path>' | head -1   # each new upload
```

Every URL returns `200`; also check the changed pages (e.g. `/aktuality/<slug>/`). Report the result in one line.
Leave `uploads/` as it is: `--ignore-existing` skips what is already on the server.
