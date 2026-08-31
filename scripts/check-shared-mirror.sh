#!/usr/bin/env bash
# Verify src/shared/ is byte-identical to the server's.
#
# src/shared/ (Zod schemas + TS types + business-date utils) is a mirror of
# backend/src/shared/, which the web app also mirrors. Nothing
# mechanically enforces this — not even a failing build — so a schema edited in
# one tree and not the others makes client and API validation drift apart
# silently. On mobile that drift is worse than on web: a stale copy of
# timezone.ts would bill sales to the wrong business day.
#
# Run after any change to shared/, and after pulling either sibling repo.

set -euo pipefail

MOBILE_SHARED="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/src/shared"
SERVER_SHARED="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/backend/src/shared"

if [ ! -d "$SERVER_SHARED" ]; then
  echo "SKIP: server tree not found at $SERVER_SHARED"
  echo "      (expected as a sibling of this project; skipping rather than failing)"
  exit 0
fi

if diff -r "$SERVER_SHARED" "$MOBILE_SHARED" > /tmp/mb-shared-diff.txt 2>&1; then
  echo "OK: src/shared is identical to backend/src/shared"
  exit 0
fi

echo "DRIFT: src/shared has diverged from backend/src/shared"
echo
cat /tmp/mb-shared-diff.txt
echo
echo "Re-sync with:"
echo "  rm -rf src/shared && cp -r ../backend/src/shared src/shared"
echo "Then verify the web app's copy matches too:"
echo "  diff -r ../backend/src/shared ../frontend/src/shared"
exit 1
