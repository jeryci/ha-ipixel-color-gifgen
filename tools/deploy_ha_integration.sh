#!/usr/bin/env zsh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_REPO="${GITHUB_REPO:-}"
INTEGRATION_SRC=""
INTEGRATION_DST="${HA_DST:-${HA_SSH_HOST:-user@ha-host}:/config/custom_components/ipixel_color}"
EXTRA_DST="${EXTRA_DST:-}"
NO_RESTART="${NO_RESTART:-0}"

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
echo "  Primary dest: $INTEGRATION_DST"
if [[ -n "$EXTRA_DST" ]]; then
  echo "  Extra dest:   $EXTRA_DST"
fi

deploy_one() {
  local dst="$1"
  local remote_host="${dst%%:*}"
  local remote_path="${dst#*:}"

  if ssh "$remote_host" "command -v rsync" >/dev/null 2>&1; then
    echo "Using rsync for $dst ..."
    rsync -avz --delete \
      --exclude='.git' \
      --exclude='*.pyc' \
      --exclude='__pycache__' \
      "$INTEGRATION_SRC/" "$dst/"
  else
    echo "rsync not available on $remote_host, falling back to scp..."
    ssh "$remote_host" "mkdir -p '$remote_path'"
    tar -C "$INTEGRATION_SRC" -cf - . | ssh "$remote_host" "tar -C '$remote_path' -xf -"
  fi
}

deploy_one "$INTEGRATION_DST"
if [[ -n "$EXTRA_DST" ]]; then
  deploy_one "$EXTRA_DST"
fi

echo ""
echo "Deployment complete."

if [[ "$NO_RESTART" != "1" ]]; then
  echo "Restarting Home Assistant ..."
  ssh "${INTEGRATION_DST%%:*}" "ha core restart"
else
  echo "Skipping HA restart because NO_RESTART=1."
fi
