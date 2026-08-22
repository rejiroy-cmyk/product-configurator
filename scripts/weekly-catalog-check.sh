#!/usr/bin/env bash
# =============================================================================
# weekly-catalog-check.sh — the loop that keeps custom-data.json honest.
#
# The shop adds and drops articles every week. Every injector in st-scraper/ is a
# one-shot chapter import, so without this the data is a photograph of the day it
# ran — and a dropped article stays orderable in the configurator forever. The
# first census found 143 of them.
#
#   1. census      snapshot every SKU the shop lists      (~8 min, anonymous)
#   2. diff        against last week and against our data
#   3. flag        write _discontinued  (verified: census + the shop's own search)
#   4. successors  propose a replacement for each one
#   5. prune       timestamped backups — writeData copies 39 MB on every write
#
# NOT built into `npm run build`: it takes eight minutes and it talks to a vendor
# system. It is a scheduled job (ch.sanitas.catalog-check) and a thing you can run
# by hand when something looks wrong.
#
# ⚠ Step 3 WRITES custom-data.json. If you are editing the catalogue in the admin
# panel when it fires, your unsaved edit and its write are two views of the same
# file. It is scheduled for Monday 06:00 for that reason.
#
# Usage:  bash scripts/weekly-catalog-check.sh          # everything
#         DRY=1 bash scripts/weekly-catalog-check.sh    # no write, report only
# =============================================================================
set -u
cd "$(dirname "$0")/.." || exit 1

STAMP=$(date +%Y-%m-%d)
CENSUS_DIR=st-scraper/census
REPORT="$CENSUS_DIR/BERICHT-$STAMP.txt"
mkdir -p "$CENSUS_DIR"

# Keep the report AND stdout — a scheduled run has nobody watching the terminal.
exec > >(tee "$REPORT") 2>&1

echo "════════════════════════════════════════════════════════════"
echo " Katalog-Abgleich  $(date '+%d.%m.%Y %H:%M')"
echo "════════════════════════════════════════════════════════════"

# Previous census BEFORE the new one is written, so --since compares week to week.
PREV=$(ls -1 "$CENSUS_DIR"/????-??-??.json.gz 2>/dev/null | tail -1)

echo
echo "── 1/5  Zensus"
node st-scraper/catalog-census.cjs || { echo "✖ Zensus fehlgeschlagen — Abbruch, es wird nichts geschrieben."; exit 1; }

echo
echo "── 2/5  Abgleich"
if [ -n "$PREV" ] && [ "$PREV" != "$CENSUS_DIR/$STAMP.json.gz" ]; then
    node st-scraper/catalog-diff.cjs --since "$PREV" --json "$CENSUS_DIR/report-$STAMP.json"
else
    echo "(kein Vorgänger-Zensus — nur der Abgleich gegen die eigenen Daten)"
    node st-scraper/catalog-diff.cjs --json "$CENSUS_DIR/report-$STAMP.json"
fi

echo
echo "── 3/5  Nicht mehr lieferbar"
if [ "${DRY:-0}" = "1" ]; then
    node st-scraper/flag-discontinued.cjs
else
    node st-scraper/flag-discontinued.cjs --write
fi

echo
echo "── 4/5  Nachfolger"
node st-scraper/find-successors.cjs --csv "$CENSUS_DIR/nachfolger-$STAMP.csv"

echo
echo "── 5/5  Aufräumen"
# Only the ISO-timestamped backups writeData makes. The NAMED ones (bak-ch3,
# bak-mojibake, bak-prelocalize-…) are deliberate milestones — never touch those.
KEEP=10
# `mapfile` is bash 4; macOS ships 3.2 and this must run under whatever launchd
# hands it, so this stays newline-driven and POSIX-ish.
OLD_LIST=$(ls -1t custom-data.json.bak-????-??-??T*Z 2>/dev/null | tail -n +$((KEEP + 1)))
if [ -n "$OLD_LIST" ]; then
    N=$(printf '%s\n' "$OLD_LIST" | wc -l | tr -d ' ')
    FREED=$(printf '%s\n' "$OLD_LIST" | tr '\n' '\0' | xargs -0 du -ch 2>/dev/null | tail -1 | cut -f1)
    printf '%s\n' "$OLD_LIST" | tr '\n' '\0' | xargs -0 rm -f
    echo "$N alte Backups gelöscht ($FREED frei), die letzten $KEEP bleiben."
else
    echo "nichts zu löschen (höchstens $KEEP Zeitstempel-Backups vorhanden)."
fi

echo
echo "════════════════════════════════════════════════════════════"
echo " Fertig. Bericht: $REPORT"
echo " Nachfolger-Liste: $CENSUS_DIR/nachfolger-$STAMP.csv"
echo "════════════════════════════════════════════════════════════"
