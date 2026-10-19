#!/usr/bin/env bash
# The server side of a release: the one place that knows the SSH target, the web root, the rsync flags and the
# folders that live only on the server. Used by scripts/release.sh (`pnpm release`), which runs every command below
# from this machine with the local SSH key; run them by hand only after building out/ with .env.local in place.
#
# Usage: scripts/deploy.sh uploads [--dry-run]        new files from uploads/ to /uploads/ (never overwrites or deletes)
#        scripts/deploy.sh pull-uploads [--dry-run]   new files from /uploads/ to uploads/ (never overwrites or deletes)
#        scripts/deploy.sh check-uploads              fail if out/ links a /uploads/… file that is not on the server
#        scripts/deploy.sh out [--dry-run]            sync out/ to the web root (--delete, server-only folders excluded)
#        scripts/deploy.sh cron [--dry-run]           the PHP scripts of cron-scripts/ to the hosting's cron folder
#        scripts/deploy.sh verify                     check that the live site answers
#
# The old PHP site that lived in /farakurim.cz/ is backed up in /stary.farakurim.cz/ (outside WEB_ROOT, never synced).
set -euo pipefail

SSH_TARGET=farakurim_cz@91.239.200.63
WEB_ROOT=/farakurim.cz
SITE=https://farakurim.cz
# Not in out/ and only on the server: uploaded files, the old site's files (kept so old links keep working), the old
# site's virtual tour, the last vira.cz verse.
SERVER_ONLY=(/uploads/ /nahrane/ /virtualni_prohlidka/ /cache/)
# Days an old build's _next/static/ file stays on the server, so a tab opened before a release still loads the
# chunks it asks for later (the lightbox, the next page).
KEEP_STATIC_DAYS=30
# The folder whose executable scripts a cron on the server runs daily (at 04:50), outside WEB_ROOT: cron-scripts/ goes
# there. The token and the log of the workflow dispatch live next to the scripts, only on the server.
CRON_DIR=/CRON.04-50

cd "$(dirname "$0")/.."
# The temporary folder of check-uploads or prune_static, removed however the script ends.
tmp=
trap '[ -z "$tmp" ] || rm -rf "$tmp"' EXIT

warn() {
  echo "warning: $1" >&2
}
fail() {
  echo "error: $1" >&2
  exit 1
}
# Sets n to rsync's -n for --dry-run.
parse_dry_run() {
  n=()
  case "${1:-}" in
    "") ;;
    --dry-run) n=(-n) ;;
    *) fail "unknown option $1" ;;
  esac
}

cmd_uploads() {
  local n
  parse_dry_run "$@"
  if [ -z "$(find uploads -type f 2>/dev/null | head -1)" ]; then
    echo "uploads/ is empty: nothing to upload."
    return
  fi
  # --ignore-existing and no --delete: the server's /uploads/ is the only copy of earlier uploads.
  rsync -az "${n[@]}" --itemize-changes --ignore-existing --chmod=D755,F644 \
    uploads/ "$SSH_TARGET:$WEB_ROOT/uploads/" | { grep '^<f' || true; } | sed 's|^[^ ]* |/uploads/|'
}

cmd_pull_uploads() {
  local n
  parse_dry_run "$@"
  mkdir -p uploads
  # --ignore-existing and no --delete: files staged in uploads/ but not released yet stay as they are.
  rsync -az "${n[@]}" --itemize-changes --ignore-existing \
    "$SSH_TARGET:$WEB_ROOT/uploads/" uploads/ | { grep '^>f' || true; } | sed 's|^[^ ]* |uploads/|'
}

cmd_check_uploads() {
  [ -d out ] || fail "out/ is missing: build first."
  tmp=$(mktemp -d)
  # Only our own links: root-relative (after a quote or a parenthesis) or on farakurim.cz, not another site's
  # /wp-content/uploads/.
  grep -rhoE '(["'\''(]|farakurim\.cz)/uploads/[A-Za-z0-9._/%-]+\.[A-Za-z0-9]+' out | sed -E 's|^[^/]*||' |
    sort -u > "$tmp/linked"
  ssh "$SSH_TARGET" "cd $WEB_ROOT && find uploads -type f" | sed 's|^|/|' | sort -u > "$tmp/on-server"
  comm -23 "$tmp/linked" "$tmp/on-server" > "$tmp/missing"
  if [ -s "$tmp/missing" ]; then
    cat "$tmp/missing"
    fail "The build links files that are not in $WEB_ROOT/uploads/ yet. Upload them first (pnpm release)."
  fi
  echo "All $(wc -l < "$tmp/linked") linked uploads are on the server."
}

cmd_out() {
  local n excludes=()
  parse_dry_run "$@"
  [ -f out/index.html ] || fail "out/ is missing: build first."
  for dir in "${SERVER_ONLY[@]}"; do excludes+=("--exclude=$dir"); done
  # --delete keeps the web root equal to the build (stale pages); the excludes protect the server-only folders
  # from it, and the filter keeps old _next/static/ files for prune_static.
  rsync -az "${n[@]}" --itemize-changes --delete "${excludes[@]}" --filter='P /_next/static/**' --chmod=D755,F644 \
    out/ "$SSH_TARGET:$WEB_ROOT/"
  prune_static "${n[@]}"
}

# Deletes the _next/static/ files that are not in out/ and older than KEEP_STATIC_DAYS, printed like rsync's
# deletions (-n only prints them), then the folders they leave empty (an old build's _next/static/<build id>/).
prune_static() {
  tmp=$(mktemp -d)
  (cd out && find _next/static -type f) | LC_ALL=C sort > "$tmp/current"
  ssh "$SSH_TARGET" "cd $WEB_ROOT && find _next/static -type f -mtime +$KEEP_STATIC_DAYS" | LC_ALL=C sort > "$tmp/old"
  comm -23 "$tmp/old" "$tmp/current" > "$tmp/stale"
  [ -s "$tmp/stale" ] || return 0
  sed 's/^/*deleting   /' "$tmp/stale"
  [ "${1:-}" = -n ] ||
    ssh "$SSH_TARGET" "cd $WEB_ROOT && xargs rm -f -- && find _next/static -mindepth 1 -type d -empty -delete" < "$tmp/stale"
}

cmd_cron() {
  local n
  parse_dry_run "$@"
  # The PHP files alone, so the cron folder's own permissions stay; no --delete, so the token and the log next to
  # them stay. 700: the hosting runs only executable scripts.
  rsync -tz --perms "${n[@]}" --itemize-changes --chmod=F700 cron-scripts/*.php "$SSH_TARGET:$CRON_DIR/" |
    { grep '^<f' || true; } | sed "s|^[^ ]* |$CRON_DIR/|"
}

cmd_verify() {
  local ok=true
  check() {
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE$1")
    echo "$code $SITE$1"
    [ "$code" = "$2" ]
  }
  check / 200 || ok=false
  check /neexistuje/ 404 || ok=false # the Czech 404 page
  check /virtualni_prohlidka/ 200 || warn "The virtual tour is missing on the server."
  check /kontakty/ 200 || ok=false
  $ok || fail "The site does not answer as expected."
}

case "${1:-}" in
  uploads) shift && cmd_uploads "$@" ;;
  pull-uploads) shift && cmd_pull_uploads "$@" ;;
  check-uploads) cmd_check_uploads ;;
  out) shift && cmd_out "$@" ;;
  cron) shift && cmd_cron "$@" ;;
  verify) shift && cmd_verify "$@" ;;
  *) sed -n '6,11p' "$0" | sed 's/^# \{0,1\}//' >&2 && exit 2 ;;
esac
