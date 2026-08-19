#!/usr/bin/env bash
# Every component colour must come from the theme.
#
# Light and dark are two token sets behind one interface, so a literal colour is
# correct in exactly one of them. A component that hard-codes `#0A84FF` looks
# right in light mode on the machine it was written on and is unreadable in dark
# mode on someone else's — and no screen test catches it, because a screen test
# renders one theme.
#
# src/theme/ is exempt: that is where the literals belong.
set -euo pipefail

cd "$(dirname "$0")/.."

if hits=$(grep -rnE '#[0-9a-fA-F]{3,8}\b|\brgba?\(' src/components \
    --include='*.ts' --include='*.tsx' \
    | grep -v '__tests__'); then
  echo "Hard-coded colours in src/components — use a theme token:" >&2
  echo "$hits" >&2
  exit 1
fi

echo "OK: every colour in src/components comes from the theme"
