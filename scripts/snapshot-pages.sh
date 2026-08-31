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

# Next persists fetch results in .next/cache across builds, so a build will
# happily reuse a day-old answer from the database and the snapshot would be
# comparing stale content. Drop it so each snapshot reflects what is actually
# stored right now.
rm -rf .next/cache/fetch-cache

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
  # The React flight payload inside <script> tags serializes component props, so
  # it necessarily changes when the data source does - a row gains an id, a
  # still becomes a media record. Comparing it across that change is impossible
  # by construction. What must not change is the DOM the browser paints, so the
  # script bodies are dropped and everything visible is compared verbatim.
  curl -s "http://localhost:$PORT$page" \
    | perl -0777 -pe 's|<script[^>]*>.*?</script>|<script/>|gs' \
    | sed -E \
        -e 's|/_next/static/[^"]*|_HASH_|g' \
        -e 's|<!--[A-Za-z0-9_-]{21}-->|<!--_BUILDID_-->|g' \
        -e 's|(/_next/image\?url=[^"&]*)&amp;[^"]*|\1|g' \
    > "$OUT/$name.html"
  echo "  $page -> $OUT/$name.html ($(wc -c < "$OUT/$name.html") bytes)"
done

echo
echo "Snapshot '$LABEL' captured."
