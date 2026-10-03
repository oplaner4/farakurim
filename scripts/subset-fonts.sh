#!/usr/bin/env bash
# Regenerates src/fonts/*.woff2 from the Oxygen TTFs (Google Fonts download).
# One file per weight covers Google's "latin" + "latin-ext" ranges, i.e. all Czech letters.
# Requires fonttools + brotli: pip install --user fonttools brotli
# Usage: scripts/subset-fonts.sh [dir-with-Oxygen-*.ttf]  (default: fonts-source/Oxygen)
set -euo pipefail
SRC="${1:-$(dirname "$0")/../fonts-source/Oxygen}"
OUT="$(dirname "$0")/../src/fonts"
LATIN="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
LATIN_EXT="U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
for pair in "Light 300" "Regular 400" "Bold 700"; do
  set -- $pair
  pyftsubset "$SRC/Oxygen-$1.ttf" --unicodes="$LATIN,$LATIN_EXT" --flavor=woff2 \
    --layout-features='*' --output-file="$OUT/oxygen-latin-ext-$2.woff2"
done
echo "Fonts written to $OUT"
