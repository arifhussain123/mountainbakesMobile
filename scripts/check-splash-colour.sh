#!/usr/bin/env bash
# The splash hand-off: `splashTop` must equal the native boot splash colour.
#
# Android draws the boot splash before a line of JavaScript runs, and its
# background can only be a flat colour — on API 31+ it is
# `android:windowSplashScreenBackground`, which takes a colour and not a
# drawable, so the gradient cannot live there. The JS splash replaces it partway
# through boot, and the two backgrounds meet at the top of the screen: if they
# disagree, that swap is a visible step change in the background instead of a
# fade between two identical ones.
#
# Nothing else enforces the pair. The colour is in Android XML, the token is in
# TypeScript, and neither build reads the other — so a palette tweak that looks
# entirely local is enough to make the splash flash.
#
# Checked here rather than in a Jest test because reading files needs `fs`,
# `path` and `__dirname`, and this project has no `@types/node` — the same
# reason `check-shared-mirror.sh` and `check-theme-tokens.sh` are shell.
set -euo pipefail

cd "$(dirname "$0")/.."

COLORS=src/theme/colors.ts
RES=android/app/src/main/res

fail=0

# `splashTop: palette.<name>` inside a given semantic map -> the palette hex.
token_hex() {
  local map=$1 name hex
  name=$(awk "/^export const ${map}:/,/^};/" "$COLORS" \
    | grep -E '^\s*splashTop:' \
    | grep -oE 'palette\.[A-Za-z0-9]+' \
    | cut -d. -f2)
  if [ -z "$name" ]; then
    echo "Could not find 'splashTop: palette.<name>' in ${map} (${COLORS})" >&2
    exit 1
  fi
  hex=$(grep -E "^  ${name}: '#" "$COLORS" | grep -oE '#[0-9A-Fa-f]{6}' | head -1)
  if [ -z "$hex" ]; then
    echo "Could not resolve palette.${name} to a hex in ${COLORS}" >&2
    exit 1
  fi
  printf '%s' "$hex" | tr '[:lower:]' '[:upper:]'
}

native_hex() {
  local dir=$1 hex
  hex=$(grep -E '<color name="bootsplash_background">' "${RES}/${dir}/colors.xml" \
    | grep -oE '#[0-9A-Fa-f]{6}' | head -1)
  if [ -z "$hex" ]; then
    echo "No bootsplash_background in ${RES}/${dir}/colors.xml" >&2
    exit 1
  fi
  printf '%s' "$hex" | tr '[:lower:]' '[:upper:]'
}

check() {
  local scheme=$1 map=$2 dir=$3 token native
  token=$(token_hex "$map")
  native=$(native_hex "$dir")
  if [ "$token" != "$native" ]; then
    echo "${scheme}: ${map}.splashTop is ${token} but ${dir}/colors.xml has ${native}" >&2
    echo "  -> the native splash would step to a different colour when the JS splash takes over" >&2
    fail=1
  fi
}

check light lightColors values
check dark darkColors values-night

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "OK: splashTop matches bootsplash_background in both schemes"
