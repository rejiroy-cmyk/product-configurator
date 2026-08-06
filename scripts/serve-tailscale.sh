#!/bin/bash
#
# Serve the built configurator over Tailscale, reachable from any device signed
# into YOUR tailnet (phone on 5G, laptop in a hotel, ...) and nobody else's.
#
#   ./scripts/serve-tailscale.sh          # build if needed, then serve
#   ./scripts/serve-tailscale.sh --build  # force a fresh production build first
#   ./scripts/serve-tailscale.sh --status # show what Tailscale is currently serving
#   ./scripts/serve-tailscale.sh --off    # stop serving
#
# This serves the single-file dist/index.html as static content, so no Node
# process has to stay alive — `tailscale serve --bg` persists across reboots.
#
# DELIBERATELY NOT FUNNEL. `tailscale serve` = tailnet-only. `tailscale funnel`
# would publish the catalog (article numbers AND prices) to the public internet.
# This script refuses to enable Funnel; don't "fix" it by swapping the verb.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_ROOT/dist"
DIST_FILE="$DIST_DIR/index.html"

die() { printf '\n\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '\033[36m▸\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }

# ── 1. Locate the Tailscale CLI ───────────────────────────────────────────────
# The Mac App Store build hides it inside the .app bundle; brew/standalone put it
# on PATH. Check all the usual homes before giving up.
find_tailscale() {
    local candidates=(
        "$(command -v tailscale 2>/dev/null || true)"
        "/Applications/Tailscale.app/Contents/MacOS/Tailscale"
        "/opt/homebrew/bin/tailscale"
        "/usr/local/bin/tailscale"
        "/usr/bin/tailscale"
    )
    for c in "${candidates[@]}"; do
        [ -n "$c" ] && [ -x "$c" ] && { echo "$c"; return 0; }
    done
    return 1
}

TS="$(find_tailscale)" || die "Tailscale CLI not found.
  Install it, then re-run:
    brew install --cask tailscale
  (or download from https://tailscale.com/download/mac)
  If you installed from the Mac App Store, the CLI lives inside the app bundle —
  this script looks there too, so just make sure the app has been launched once."

info "Using Tailscale CLI: $TS"

# ── 2. Handle the simple subcommands ──────────────────────────────────────────
case "${1:-}" in
    --status)
        "$TS" serve status || true
        exit 0
        ;;
    --off)
        info "Stopping Tailscale serve for this machine..."
        "$TS" serve reset
        info "Stopped. The app is no longer reachable over the tailnet."
        exit 0
        ;;
esac

# ── 3. Make sure we're logged in and the node is up ───────────────────────────
if ! "$TS" status >/dev/null 2>&1; then
    die "Tailscale is installed but not running/logged in.
  Run:  $TS up
  then re-run this script."
fi

# ── 4. HTTPS certs must be enabled on the tailnet, or `serve` can't get a cert ──
# status --json exposes CertDomains; empty means HTTPS Certificates is off.
if ! "$TS" status --json 2>/dev/null | grep -q '"CertDomains"[[:space:]]*:[[:space:]]*\[[[:space:]]*"'; then
    die "Your tailnet doesn't have HTTPS certificates enabled, which \`tailscale serve\` needs.
  Enable it once, here:
    https://login.tailscale.com/admin/dns  ->  'HTTPS Certificates'  ->  Enable
  Then re-run this script."
fi

# ── 5. Build if asked, or if dist/ is missing / older than the sources ─────────
needs_build=0
[ "${1:-}" = "--build" ] && needs_build=1
[ -f "$DIST_FILE" ] || { needs_build=1; warn "dist/index.html missing."; }

if [ "$needs_build" -eq 0 ]; then
    # Stale check: any tracked source newer than the built file?
    newer="$(find "$REPO_ROOT/modules" "$REPO_ROOT/app.js" "$REPO_ROOT/index.html" \
                  "$REPO_ROOT/index.css" "$REPO_ROOT/custom-data.json" \
                  -newer "$DIST_FILE" -print -quit 2>/dev/null || true)"
    if [ -n "$newer" ]; then
        warn "dist/ is older than your sources (e.g. ${newer#"$REPO_ROOT"/}) — rebuilding."
        needs_build=1
    fi
fi

if [ "$needs_build" -eq 1 ]; then
    info "Running production build (npm run build)..."
    ( cd "$REPO_ROOT" && npm run build )
fi

[ -f "$DIST_FILE" ] || die "Build finished but $DIST_FILE still doesn't exist."

# ── 6. Serve it ───────────────────────────────────────────────────────────────
info "Publishing dist/ to your tailnet (private — not Funnel)..."
if ! "$TS" serve --bg "$DIST_DIR" 2>/tmp/ts-serve-err; then
    warn "Static-directory serve failed. Falling back to a local static server + proxy."
    warn "$(cat /tmp/ts-serve-err)"
    # Fallback for older Tailscale builds whose `serve` only accepts a port/URL.
    # vite preview already binds 4175 and is LAN/loopback reachable.
    ( cd "$REPO_ROOT" && npm run preview >/tmp/configurator-preview.log 2>&1 & )
    sleep 3
    "$TS" serve --bg 4175 \
        || die "Both serve modes failed. Run '$TS serve status' and check 'tailscale version'."
    warn "Using proxy mode: this needs 'npm run preview' running. Log: /tmp/configurator-preview.log"
fi

DNS_NAME="$("$TS" status --json 2>/dev/null \
    | grep -o '"DNSName"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 | sed 's/.*"\([^"]*\)"$/\1/' | sed 's/\.$//')"

printf '\n\033[32m✓ Serving.\033[0m\n\n'
if [ -n "$DNS_NAME" ]; then
    printf '   Open this on your iPhone:  \033[1mhttps://%s/\033[0m\n\n' "$DNS_NAME"
else
    printf '   Run "%s serve status" to see the URL.\n\n' "$TS"
fi
cat <<'NOTES'
   Requirements for it to work from anywhere:
     - The iPhone has the Tailscale app installed, signed into the SAME account,
       and the VPN toggle ON.
     - THIS MAC IS AWAKE. A sleeping Mac serves nothing. For a long trip either
       leave it plugged in with sleep disabled, or run:
           caffeinate -dims &
   Stop serving with:  ./scripts/serve-tailscale.sh --off
NOTES
