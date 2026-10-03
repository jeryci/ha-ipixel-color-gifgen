#!/usr/bin/env bash
# Measures where the time in a HACS update actually goes.
#
# Run this on the Home Assistant host (Terminal add-on or an SSH shell):
#   bash /config/custom_components/ipixel_color/../../diagnose_hacs_update.sh
# or paste the body straight into the terminal.
#
# HACS performs three distinct phases per update, and only one of them is
# usually slow:
#   1. download the repository archive from GitHub   <- network bound
#   2. extract the archive                           <- CPU / disk bound
#   3. copy custom_components into /config          <- disk bound, per file
#
# The file count matters more than the byte count in phases 2 and 3, which is
# why the count is reported next to each timing.

set -u

REPO="${REPO:-jeryci/ha-ipixel-color-gifgen}"
BRANCH="${BRANCH:-main}"
DEST="${DEST:-/config/custom_components/ipixel_color_test}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fmt() { printf '%-28s %s\n' "$1" "$2"; }

echo "=== HACS update diagnosis ==="
echo "repo: $REPO@$BRANCH"
echo "work: $WORK"
echo

# Cache-bust so this measures a real download rather than a CDN hit.
STAMP="$(date +%s)"
URL="https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH?cb=$STAMP"

echo "--- 1. download (network) ---"
START=$(date +%s.%N)
if curl -sSL --max-time 600 -o "$WORK/repo.tgz" "$URL"; then
    END=$(date +%s.%N)
    BYTES=$(wc -c < "$WORK/repo.tgz" | tr -d ' ')
    ELAPSED=$(awk -v a="$START" -v b="$END" 'BEGIN { printf "%.2f", b - a }')
    MBPS=$(awk -v b="$BYTES" -v e="$ELAPSED" 'BEGIN { printf "%.1f", (b / 1048576) / (e > 0 ? e : 1) }')
    fmt "downloaded" "$(awk -v b="$BYTES" 'BEGIN { printf "%.1f MB", b / 1048576 }')"
    fmt "time" "${ELAPSED}s"
    fmt "throughput" "${MBPS} MB/s"
else
    echo "download FAILED - the host cannot reach GitHub over HTTPS?"
    exit 1
fi
echo

echo "--- 2. extract (cpu/disk) ---"
START=$(date +%s.%N)
tar -xzf "$WORK/repo.tgz" -C "$WORK" 2>/dev/null
END=$(date +%s.%N)
fmt "extract time" "$(awk -v a="$START" -v b="$END" 'BEGIN { printf "%.2fs", b - a }')"
echo

echo "--- 3. copy into custom_components (disk, per file) ---"
SRC="$(find "$WORK" -maxdepth 3 -type d -path '*/custom_components/ipixel_color' | head -1)"
if [ -z "$SRC" ]; then
    echo "could not locate the integration inside the archive"
    exit 1
fi
FILES=$(find "$SRC" -type f | wc -l | tr -d ' ')
SIZE=$(du -sk "$SRC" | cut -f1)
fmt "files" "$FILES"
fmt "size" "${SIZE}KB"

rm -rf "$DEST"
START=$(date +%s.%N)
mkdir -p "$(dirname "$DEST")"
cp -R "$SRC" "$DEST" 2>/dev/null
END=$(date +%s.%N)
fmt "copy time" "$(awk -v a="$START" -v b="$END" 'BEGIN { printf "%.2fs", b - a }')"
rm -rf "$DEST"
echo

echo "--- destination filesystem ---"
df -h /config 2>/dev/null | tail -1
echo
echo "Interpretation:"
echo "  download >> copy  -> bandwidth; reduce the payload or fetch locally"
echo "  copy >> download  -> file count; prune unused bundled assets"
echo "  both small        -> the wait is elsewhere (HA restart or HACS validation)"