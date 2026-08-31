#!/usr/bin/env bash
# Layer 2 - the phase 2 gate.
#
# Captures the rendered HTML of every public page, with build-specific noise
# normalized away. Run it once BEFORE the pages start reading from Supabase and
# once after; if the diff is empty, the migration is provably lossless for
# everything a human can see - including the About page's comma/"and"/period
# join and the zero-padded counts that a field-level check cannot reach.
#
#   scripts/snapshot-pages.sh before
#   ... land the read path ...
#   scripts/snapshot-pages.sh after
#   diff -ru .snapshots/before .snapshots/after
#
# Byte-identical or it does not ship.

set -euo pipefail

LABEL="${1:?usage: snapshot-pages.sh <before|after>}"
PORT="${PORT:-3210}"
OUT=".snapshots/$LABEL"
PAGES=(/ /work /clients /about /contact)

cd "$(dirname "$0")/.."
mkdir -p "$OUT"

echo "Building..."
npm run build >/dev/null

echo "Starting server on :$PORT"
npx next start -p "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  curl -sf "http://localhost:$PORT/" >/dev/null 2>&1 && break
  sleep 0.5
done

for page in "${PAGES[@]}"; do
  name="$(echo "$page" | sed 's|^/$|home|; s|^/||; s|/|_|g')"
  curl -s "http://localhost:$PORT$page" \
    | sed -E \
        -e 's|/_next/static/[^"]*|_HASH_|g' \
        -e 's|"buildId":"[^"]*"|"buildId":"_ID_"|g' \
        -e 's|\$L[0-9a-f]+|$L_ID_|g' \
        -e 's|self\.__next_f\.push\(\[1,"[0-9a-f]+:|self.__next_f.push([1,"_ID_:|g' \
    > "$OUT/$name.html"
  echo "  $page -> $OUT/$name.html ($(wc -c < "$OUT/$name.html") bytes)"
done

echo
echo "Snapshot '$LABEL' captured."
