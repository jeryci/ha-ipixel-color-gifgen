#!/usr/bin/env zsh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_REPO="${GITHUB_REPO:-}"
INTEGRATION_SRC=""
INTEGRATION_DST="${HA_SSH_HOST:-user@ha-host}:/config/custom_components/ipixel_color"

if [[ -n "$GITHUB_REPO" ]]; then
  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "$TMPDIR"' EXIT
  echo "Cloning $GITHUB_REPO ..."
  git clone --depth 1 "$GITHUB_REPO" "$TMPDIR"
  INTEGRATION_SRC="$TMPDIR/custom_components/ipixel_color"
else
  INTEGRATION_SRC="$REPO_DIR/custom_components/ipixel_color"
fi

if [[ ! -d "$INTEGRATION_SRC" ]]; then
  echo "ERROR: source integration folder not found at $INTEGRATION_SRC"
  exit 1
fi

echo "Deploying iPIXEL integration to HA..."
echo "  Source: $INTEGRATION_SRC"
echo "  Dest:   $INTEGRATION_DST"

rsync -avz --delete \
  --exclude='.git' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  "$INTEGRATION_SRC/" "$INTEGRATION_DST/"

echo ""
echo "Deployment complete."
echo "Next: restart HA, or if you want to do it from here, uncomment the line below."
# echo "ssh ${HA_SSH_HOST:-user@ha-host} 'ha core restart'"
