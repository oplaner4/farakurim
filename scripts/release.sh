#!/usr/bin/env bash
# `pnpm release`: publishes the site. Uploads the new files staged in uploads/, bumps the version in package.json,
# commits and tags it vX.Y.Z and pushes main with the tag; GitHub Actions then checks, builds and deploys out/
# (.github/workflows/build-and-deploy.yml). Server details live in scripts/deploy.sh.
#
# Usage: pnpm release            preview, then ask y/N (without a terminal it only previews)
#        pnpm release --yes      release without asking (an agent passes it only after the user's yes)
#        pnpm release --major    a major version (e.g. a redesign); combines with --yes
#
# The version follows the Conventional Commits since the last tag: minor when a feat outside the content scope is
# among them, patch otherwise. A failed run is fixed in a new commit and released again; never move a pushed tag.
set -euo pipefail

cd "$(dirname "$0")/.."

yes=false
major=false
for arg in "$@"; do
  case "$arg" in
    --yes) yes=true ;;
    --major) major=true ;;
    *) sed -n '6,8p' "$0" | sed 's/^# \{0,1\}//' >&2 && exit 2 ;;
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

# 3. The yes: a release publishes the site.
if ! $yes; then
  if [ ! -t 0 ]; then
    echo "Preview only. Run \`pnpm release --yes\` after the user's yes."
    exit 0
  fi
  read -r -p "Publish v$next to https://farakurim.cz/? [y/N] " answer
  [[ "$answer" =~ ^[yY]$ ]] || { echo "Nothing was published."; exit 0; }
fi

# 4. Uploads first, so no deployed page links a file that is not on the server yet.
scripts/deploy.sh uploads > /dev/null
# Sets package.json, commits it with a commitlint-valid message and creates the annotated tag.
pnpm version "$bump" -m "chore(release): v%s"
git push origin main --follow-tags

echo
echo "Released v$next: GitHub Actions now builds and deploys it (the repo's Actions tab)."
