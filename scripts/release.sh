#!/usr/bin/env bash
# `pnpm release`: publishes the site. Uploads the new files staged in uploads/, bumps the version in package.json,
# commits and tags it vX.Y.Z and pushes main with the tag; GitHub Actions then checks, builds and deploys out/
# (.github/workflows/deploy.yml). With --local it deploys from this machine instead, e.g. when Actions is down: it
# runs the full check and a production build (with the keys in .env.local), shows what the sync will change, deploys
# out/ and verifies the live site before it tags; the release commit then carries the trailer Release-Deploy: local,
# so the workflow does not deploy the tag again. Server details live in scripts/deploy.sh.
#
# Usage: pnpm release            preview, then ask y/N (without a terminal it only previews)
#        pnpm release --local    check, build and deploy from this machine instead of GitHub Actions
#        pnpm release --yes      release without asking (an agent passes it only after the user's yes)
#        pnpm release --major    a major version (e.g. a redesign); combines with the others
#
# The version follows the Conventional Commits since the last tag: minor when a feat outside the content scope is
# among them, patch otherwise. A failed run is fixed in a new commit and released again; never move a pushed tag.
set -euo pipefail

cd "$(dirname "$0")/.."

yes=false
major=false
deploy_here=false
for arg in "$@"; do
  case "$arg" in
    --yes) yes=true ;;
    --major) major=true ;;
    --local) deploy_here=true ;;
    *) sed -n '9,12p' "$0" | sed 's/^# \{0,1\}//' >&2 && exit 2 ;;
  esac
done

fail() {
  echo "error: $1" >&2
  exit 1
}

# 1. A clean main that is not behind origin.
[ "$(git branch --show-current)" = main ] || fail "Not on main."
[ -z "$(git status --porcelain)" ] || fail "The tree is not clean (also AGENTS.md re-added by next dev): commit or discard it first."
git fetch --quiet origin main
[ -z "$(git rev-list HEAD..origin/main)" ] || fail "main is behind origin/main: pull first."

# 2. The commits since the last release and the version.
last=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)
commits=$(git log --format='%h %s' ${last:+"$last.."}HEAD)
[ -n "$commits" ] || fail "Nothing to release: no commits since $last."
if $major; then
  bump=major
elif cut -d' ' -f2- <<< "$commits" | grep -E '^feat(\([^)]*\))?!?:' | grep -qvE '^feat\(content\)'; then
  bump=minor
else
  bump=patch
fi
next=$(node -p "const [a, b, c] = require('./package.json').version.split('.').map(Number);
  ({ major: [a + 1, 0, 0], minor: [a, b + 1, 0], patch: [a, b, c + 1] })['$bump'].join('.')")

echo "Commits since ${last:-the start}:"
sed 's/^/  /' <<< "$commits"
echo
echo "Version: v$next ($bump)"
echo
echo "New files for /uploads/:"
uploads=$(scripts/deploy.sh uploads --dry-run)
sed 's/^/  /' <<< "${uploads:-(none)}"
echo

# 3–5 only with --local; without it GitHub Actions checks and builds the tagged commit.
if $deploy_here; then
  # 3. The production keys: without them the calendars ship mock data and the site does not count visits.
  for key in NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY NEXT_PUBLIC_MATOMO_URL NEXT_PUBLIC_MATOMO_SITE_ID; do
    [ -n "${!key:-}" ] || grep -qE "^$key=.+" .env.local 2> /dev/null || fail "$key is not set in .env.local."
  done

  # 4. The full check and a fresh build.
  echo "Checking and building…"
  # Runs a step quietly and shows its output only when it fails.
  step() {
    local log
    log=$(mktemp)
    "$@" > "$log" 2>&1 || { cat "$log" >&2; fail "$* failed."; }
    rm -f "$log"
  }
  step pnpm exec prettier --check .
  step pnpm test
  step pnpm lint
  step pnpm exec next typegen
  step pnpm exec tsc --noEmit
  rm -rf out
  step pnpm build
  [ -z "$(git status --porcelain)" ] || fail "The check or the build changed the tree: commit or discard it first."
  echo

  # 5. What the sync changes in the web root (rsync dry run). New _next/ chunks replace the old ones on every build.
  changes=$(scripts/deploy.sh out --dry-run)
  added=$(grep -c '^<f+++' <<< "$changes" || true)
  changed=$(grep -c '^<f[^+]' <<< "$changes" || true)
  removed=$(grep -c '^\*deleting' <<< "$changes" || true)
  echo "Sync of out/ to the web root: $added new, $changed changed, $removed deleted files."
  deleted=$(grep '^\*deleting' <<< "$changes" | grep -v ' _next/' | sed 's/^\*deleting *//' || true)
  if [ -n "$deleted" ]; then
    echo "Deleted outside _next/:"
    sed 's/^/  /' <<< "$deleted"
  fi
  echo
fi

# 6. The yes: a release publishes the site.
if ! $yes; then
  if [ ! -t 0 ]; then
    echo "Preview only. Run \`pnpm release --yes$($deploy_here && echo ' --local' || true)\` after the user's yes."
    exit 0
  fi
  if $deploy_here; then how="from this machine"; else how="through GitHub Actions"; fi
  read -r -p "Publish v$next to https://farakurim.cz/ $how? [y/N] " answer
  [[ "$answer" =~ ^[yY]$ ]] || { echo "Nothing was published."; exit 0; }
fi

# 7. Uploads first, so no deployed page links a file that is not on the server yet; then, with --local, the site.
scripts/deploy.sh uploads > /dev/null
if $deploy_here; then
  scripts/deploy.sh check-uploads
  scripts/deploy.sh out > /dev/null
  scripts/deploy.sh verify
fi

# 8. The version: package.json, the commit chore(release): vX.Y.Z and the annotated tag, pushed with main. The tag
# makes GitHub Actions deploy, unless the commit's Release-Deploy: local trailer says this machine already did.
# (pnpm version keeps only the first line of a message, so git makes the commit and the tag.)
pnpm version "$bump" --no-git-tag-version > /dev/null
git add package.json
if $deploy_here; then
  git commit --quiet -m "chore(release): v$next" -m "Release-Deploy: local"
else
  git commit --quiet -m "chore(release): v$next"
fi
git tag -a "v$next" -m "chore(release): v$next"
git push origin main --follow-tags

echo
if $deploy_here; then
  echo "Released v$next to https://farakurim.cz/."
else
  echo "Released v$next: GitHub Actions now checks, builds and deploys it (the repo's Actions tab)."
fi
