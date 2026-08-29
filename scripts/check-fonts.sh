#!/usr/bin/env bash
# The font contract: a family name in TypeScript must be a family registered in
# Kotlin, backed by an XML family that declares every weight the scale asks for.
#
# Three artefacts have to agree and no build checks any of it:
#
#   src/common/theme/typography.ts   names the families and the weights used
#   MainApplication.kt               registers those names with ReactFontManager
#   android/app/src/main/res/font/   holds the XML families and the .ttf files
#
# Every way they can disagree fails SILENTLY, which is why this exists:
#
#   - A name that does not match misses ReactFontManager's custom-font cache,
#     falls through to `Typeface.create(name, style)`, and Android hands back the
#     system sans. Nothing throws; the app just renders in the wrong face.
#   - A weight the scale uses but the XML omits resolves to the nearest declared
#     one, so an 800 heading quietly renders at 700 and v6's hierarchy — which is
#     built on the 400/800 gap — flattens.
#
# ---------------------------------------------------------------------------
# Only the DEFAULT face is held to declaring every weight
# ---------------------------------------------------------------------------
# The two alternates the picker offers do not carry the full range and never
# will: Space Grotesk has no 800 and no italic at all, Libre Baskerville has no
# 800. Those are properties of the typefaces, not gaps in this repo — a
# two-weight Baskerville is what a Baskerville is. Failing on them would mean
# either dropping the faces or asserting something untrue.
#
# So the weight rule (check 4) runs against `fontFamily`, the default face. Every
# family, default or selectable, still has to be registered and have its files
# present — that is the failure this script exists for, and it is equally fatal
# on a face reached only through the picker.
#   - A .ttf referenced by an XML but missing from the tree is an AAPT error, so
#     that one at least fails loudly. Checked anyway because it is one line.
#
# Checked here rather than in a Jest test because reading files needs `fs`,
# `path` and `__dirname`, and this project has no `@types/node` — the same reason
# `check-shared-mirror.sh`, `check-theme-tokens.sh` and `check-splash-colour.sh`
# are shell.
set -euo pipefail

cd "$(dirname "$0")/.."

TYPO=src/common/theme/typography.ts
MAIN=android/app/src/main/java/com/mountainbakes/mobile/MainApplication.kt
FONTDIR=android/app/src/main/res/font

fail=0
note() { echo "$1" >&2; fail=1; }

[ -f "$TYPO" ] || { echo "missing $TYPO" >&2; exit 1; }
[ -f "$MAIN" ] || { echo "missing $MAIN" >&2; exit 1; }
[ -d "$FONTDIR" ] || { echo "missing $FONTDIR" >&2; exit 1; }

# --- 1. every family the app can use is registered in MainApplication ---
#
# TWO sources, and both matter. `fontFamily` is the default face's three
# families; `TYPEFACES` is every face the Settings picker can select. A family
# reachable only through the picker is exactly as capable of falling back to the
# system sans as the default one, and rather more likely to — nobody looks at it
# until a user picks it.
default_families=$(awk '/^export const fontFamily = \{/,/^\} as const;/' "$TYPO" \
  | grep -oE ":\s*'[A-Za-z0-9]+'" | grep -oE "'[A-Za-z0-9]+'" | tr -d "'")

selectable_families=$(awk '/^export const TYPEFACES/,/^\};/' "$TYPO" \
  | grep -oE "(body|display):\s*'[A-Za-z0-9]+'" | grep -oE "'[A-Za-z0-9]+'" | tr -d "'")

families=$(printf '%s\n%s\n' "$default_families" "$selectable_families" | sort -u)

if [ -z "$default_families" ]; then
  echo "Could not read any family from 'fontFamily' in ${TYPO}" >&2
  exit 1
fi
if [ -z "$selectable_families" ]; then
  echo "Could not read any family from 'TYPEFACES' in ${TYPO}" >&2
  exit 1
fi

for fam in $families; do
  if ! grep -q "\"${fam}\"" "$MAIN"; then
    note "'${fam}' is used in ${TYPO} but never registered in ${MAIN}"
    note "  -> the lookup misses the cache and Android substitutes the system sans"
    continue
  fi

  # --- 2. the registered family points at an XML family that exists ---
  res=$(grep -oE "addCustomFont\([^,]+, \"${fam}\", R\.font\.[a-z0-9_]+" "$MAIN" \
    | grep -oE 'R\.font\.[a-z0-9_]+' | cut -d. -f3)
  if [ -z "$res" ]; then
    note "'${fam}' is registered in ${MAIN} without an R.font.* resource"
    continue
  fi
  xml="${FONTDIR}/${res}.xml"
  if [ ! -f "$xml" ]; then
    note "'${fam}' registers R.font.${res} but ${xml} does not exist"
    continue
  fi

  # --- 3. every .ttf the XML references is present ---
  for ref in $(grep -oE 'android:font="@font/[a-z0-9_]+"' "$xml" \
      | grep -oE '@font/[a-z0-9_]+' | cut -d/ -f2 | sort -u); do
    if ! ls "${FONTDIR}/${ref}".* >/dev/null 2>&1; then
      note "${xml} references @font/${ref}, which is not in ${FONTDIR}"
    fi
  done
done

# --- 4. every (family, weight, style) the scale uses is declared ---
#
# Each `token({...})` in the `type` scale carries a family, a weight and
# optionally `fontStyle: 'italic'`. A combination the XML does not declare is the
# silent-flattening case above.
node - "$TYPO" "$MAIN" "$FONTDIR" <<'NODE' || fail=1
const fs = require('fs');
const [typo, main, fontdir] = process.argv.slice(2);
const src = fs.readFileSync(typo, 'utf8');

// key -> 'FamilyName'
const famMap = {};
const famBlock = src.slice(
  src.indexOf('export const fontFamily = {'),
  src.indexOf('} as const;', src.indexOf('export const fontFamily = {')),
);
for (const m of famBlock.matchAll(/(\w+):\s*'([A-Za-z0-9]+)'/g)) famMap[m[1]] = m[2];

// 'FamilyName' -> res id, from the Kotlin registration
const kotlin = fs.readFileSync(main, 'utf8');
const resMap = {};
for (const m of kotlin.matchAll(/addCustomFont\([^,]+,\s*"([A-Za-z0-9]+)",\s*R\.font\.([a-z0-9_]+)/g))
  resMap[m[1]] = m[2];

// what the scale actually asks for
const typeBlock = src.slice(src.indexOf('export const type'));
const wanted = new Set();
for (const m of typeBlock.matchAll(/(\w+):\s*token\(\{([\s\S]*?)\}\)/g)) {
  const body = m[2];
  const fk = (/fontFamily:\s*fontFamily\.(\w+)/.exec(body) || [])[1];
  if (!fk) continue;
  const w = (/fontWeight:\s*'(\d+)'/.exec(body) || [, '400'])[1];
  const it = /fontStyle:\s*'italic'/.test(body);
  wanted.add(`${famMap[fk]}|${w}|${it ? 'italic' : 'normal'}|${m[1]}`);
}

let bad = 0;
for (const entry of [...wanted].sort()) {
  const [fam, weight, style, token] = entry.split('|');
  const res = resMap[fam];
  if (!res) continue; // already reported by the shell half
  const xml = fs.readFileSync(`${fontdir}/${res}.xml`, 'utf8');
  const declared = [...xml.matchAll(
    /android:fontStyle="(\w+)"\s*\n?\s*android:fontWeight="(\d+)"/g,
  )].map(m => `${m[2]}|${m[1]}`);
  if (!declared.includes(`${weight}|${style}`)) {
    console.error(
      `type.${token} asks for ${fam} ${weight} ${style}, which ${res}.xml does not declare`,
    );
    console.error(
      `  -> it resolves to the nearest declared weight instead, silently`,
    );
    bad = 1;
  }
}
process.exit(bad);
NODE

if [ "$fail" -ne 0 ]; then
  echo >&2
  echo "Fonts: TypeScript, Kotlin and res/font disagree (see above)." >&2
  exit 1
fi

echo "OK: every family and weight the type scale uses is registered and declared"
