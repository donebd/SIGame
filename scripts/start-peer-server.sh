#!/usr/bin/env bash
set -e

echo "============================================"
echo " SIGame - Remote Control Server (macOS/Linux)"
echo "============================================"
echo

# ── macOS: remove Gatekeeper quarantine on first run ──────────────────────
if [[ "$(uname)" == "Darwin" ]]; then
    if xattr -l "$0" 2>/dev/null | grep -q "com.apple.quarantine"; then
        echo "[INFO] Removing macOS quarantine attribute..."
        xattr -d com.apple.quarantine "$0" 2>/dev/null || true
    fi
fi

# ── Check Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found."
    echo "Install it from https://nodejs.org then re-run this script."
    exit 1
fi

# ── Install peerjs globally if missing ────────────────────────────────────
if ! command -v peerjs &>/dev/null; then
    echo "[INFO] Installing PeerJS server..."
    npm install -g peer
fi

# ── Detect local network IP ───────────────────────────────────────────────
LOCAL_IP=""
if [[ "$(uname)" == "Darwin" ]]; then
    for iface in en0 en1; do
        LOCAL_IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
        [[ -n "$LOCAL_IP" ]] && break
    done
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi
[[ -z "$LOCAL_IP" ]] && LOCAL_IP="localhost"

echo "[OK] Local IP: $LOCAL_IP"
echo
echo "  PeerJS signaling : port 9001"
echo "  HTTP file server : http://$LOCAL_IP:9000"
echo
echo "  Keep this terminal open while playing!"
echo "============================================"
echo

# ── Start HTTP file server in background ─────────────────────────────────
# Using http-server instead of serve — serve strips query params on redirects
npx --yes http-server -p 9000 --cors -c-1 -s . &>/dev/null &
HTTP_PID=$!

# ── Open browser after short delay ───────────────────────────────────────
sleep 2
if [[ "$(uname)" == "Darwin" ]]; then
    open "http://$LOCAL_IP:9000/SIGame.html"
else
    xdg-open "http://$LOCAL_IP:9000/SIGame.html" 2>/dev/null || true
fi

# ── Start PeerJS in foreground ────────────────────────────────────────────
peerjs --port 9001 --key peerjs --path /

# Cleanup on exit
kill "$HTTP_PID" 2>/dev/null || true
