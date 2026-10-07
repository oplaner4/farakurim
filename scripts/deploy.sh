#!/usr/bin/env bash
# The server side of a release: the one place that knows the SSH target, the web root, the rsync flags and the
# folders that live only on the server. Used by scripts/release.sh (`pnpm release`), which runs every command below
# from this machine with the local SSH key; run them by hand only after building out/ with .env.local in place.
#
# Usage: scripts/deploy.sh uploads [--dry-run]        new files from uploads/ to /uploads/ (never overwrites or deletes)
#        scripts/deploy.sh pull-uploads [--dry-run]   new files from /uploads/ to uploads/ (never overwrites or deletes)
#        scripts/deploy.sh check-uploads              fail if out/ links a /uploads/… file that is not on the server
#        scripts/deploy.sh out [--dry-run]            sync out/ to the web root (--delete, server-only folders excluded)
#        scripts/deploy.sh verify [path…]             check the live site (and each given path, e.g. /uploads/x.pdf)
#
# The old PHP site that lived in /farakurim.cz/ is backed up in /stary.farakurim.cz/ (outside WEB_ROOT, never synced).
set -euo pipefail

SSH_TARGET=farakurim_cz@91.239.200.63
WEB_ROOT=/farakurim.cz
SITE=https://farakurim.cz
# Not in out/ and only on the server: uploaded files, the old site's files (kept so old links keep working), the old
# site's virtual tour, the last vira.cz verse.
SERVER_ONLY=(/uploads/ /nahrane/ /virtualni_prohlidka/ /cache/)

cd "$(dirname "$0")/.."

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
  local tmp
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
  # --delete keeps the web root equal to the build (stale pages, old _next/ chunks); the excludes protect the
  # server-only folders from it.
  rsync -az "${n[@]}" --itemize-changes --delete "${excludes[@]}" --chmod=D755,F644 \
    out/ "$SSH_TARGET:$WEB_ROOT/"
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
  for path in "$@"; do check "$path" 200 || ok=false; done
  # Copied to the server once (see the farnost-release skill); without it only the footer link breaks.
  check /virtualni_prohlidka/ 200 || warn "The virtual tour is missing on the server."
  $ok || fail "The site does not answer as expected."
}

case "${1:-}" in
  uploads) shift && cmd_uploads "$@" ;;
  pull-uploads) shift && cmd_pull_uploads "$@" ;;
  check-uploads) cmd_check_uploads ;;
  out) shift && cmd_out "$@" ;;
  verify) shift && cmd_verify "$@" ;;
  *) sed -n '6,10p' "$0" | sed 's/^# \{0,1\}//' >&2 && exit 2 ;;
esac
