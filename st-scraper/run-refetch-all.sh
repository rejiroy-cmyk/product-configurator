#!/usr/bin/env bash
# Re-fetch full product text for every truncated art-Nr, 5 shards in parallel.
#
# The SAP session behind cookie.txt is short-lived (observed ~20-30 min from
# minting), so this does a ONE-ARTICLE pre-flight first and refuses to start on a
# dead cookie rather than launching five processes that all abort. Every shard is
# resumable: re-running after a cookie refresh continues where it stopped.
#
#   1. log in to profishop in a browser
#   2. copy the session cookie into st-scraper/cookie.txt
#   3. bash st-scraper/run-refetch-all.sh          # run it PROMPTLY after step 2
set -u
cd "$(dirname "$0")/.." || exit 1

SHARDS=${SHARDS:-5}
CONC=${CONC:-1}
LOGDIR=$(mktemp -d)

echo "pre-flight: checking the SAP session…"
if ! COOKIE_FILE=cookie.txt node st-scraper/refetch-truncated-text.cjs --shard 0 --limit 1 --conc 1 >"$LOGDIR/preflight.log" 2>&1; then
    echo
    echo "✖ session is dead — nothing was started."
    grep -E "SESSION EXPIRED|cookie" "$LOGDIR/preflight.log" | head -3
    echo
    echo "  Refresh st-scraper/cookie.txt from a logged-in profishop tab, then re-run this script."
    exit 2
fi
echo "  session OK"

echo "launching $SHARDS shards at --conc $CONC …"
for i in $(seq 0 $((SHARDS - 1))); do
    COOKIE_FILE=cookie.txt node st-scraper/refetch-truncated-text.cjs --shard "$i" --conc "$CONC" \
        >"$LOGDIR/shard-$i.log" 2>&1 &
done
wait

echo
aborted=0
for i in $(seq 0 $((SHARDS - 1))); do
    line=$(tail -1 "$LOGDIR/shard-$i.log")
    echo "shard $i: $line"
    case "$line" in *ABORTED*) aborted=1 ;; esac
done

node -e '
const fs=require("fs"), p="st-scraper";
let done=0, text=0, total=0;
for (const f of fs.readdirSync(p)) {
  if (/^truncated-shard-\d+\.json$/.test(f)) total += JSON.parse(fs.readFileSync(p+"/"+f,"utf8")).length;
  if (/^text-refetch-shard-\d+\.json$/.test(f)) {
    const j=JSON.parse(fs.readFileSync(p+"/"+f,"utf8"));
    const k=Object.keys(j); done+=k.length; text+=k.filter(x=>j[x]).length;
  }
}
console.log(`\nTOTAL: ${done}/${total} art-Nrs fetched, ${text} returned text (${(total-done)} left)`);
'

if [ "$aborted" = "1" ]; then
    echo "Session expired mid-run. Refresh cookie.txt and re-run — progress is saved."
    exit 2
fi
echo "All shards complete. Next: node st-scraper/apply-refetched-text.cjs   (dry run)"
