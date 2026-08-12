#!/usr/bin/env bash
#
# Installs the Slashkit items into the playground the way a real consumer does.
#
# ── Why it serves the registry locally instead of using the published URL ────
# The playground has to demo THIS commit, not the last one that deployed. If it
# installed from prakash-pun.github.io, a change to a registry source would not
# reach the demo until after the deploy that publishes it — so the playground
# would always be one commit behind, and a broken item would ship green.
#
# Building `public/r` and serving it on localhost keeps the install path honest
# (this is the real `shadcn add`, over real HTTP, resolving real
# `registryDependencies`) while pinning it to the working tree.
#
# The installed files are gitignored — this script is the only thing that
# produces them, for the same reason the built JSON is not committed.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${SLASHKIT_SYNC_PORT:-8232}"
SERVER_PID=""

CONFIG="$REPO/playground/components.json"
CONFIG_BACKUP=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  # Always put the published URL back, including on a failed install — the
  # committed config documents where the registry really lives, and leaving a
  # localhost URL in it would be both wrong and easy to commit by accident.
  if [ -n "$CONFIG_BACKUP" ] && [ -f "$CONFIG_BACKUP" ]; then
    mv "$CONFIG_BACKUP" "$CONFIG"
  fi
}
trap cleanup EXIT

echo "▸ building the registry"
(cd "$REPO" && npx shadcn build >/dev/null)

echo "▸ serving it on :$PORT"
(cd "$REPO/public" && npx --yes http-server -p "$PORT" -s --cors >/dev/null 2>&1) &
SERVER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/r/registry.json" >/dev/null && break
  sleep 1
done

echo "▸ pointing components.json at the local registry"
# shadcn validates the registry entry as a real URL, so `${VAR}` expansion is
# not an option — the committed config carries the published URL and this swaps
# it for the length of the install. `cleanup` above restores it either way.
CONFIG_BACKUP="$(mktemp)"
cp "$CONFIG" "$CONFIG_BACKUP"
node -e '
  const fs = require("fs");
  const [file, url] = process.argv.slice(1);
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  config.registries["@slashkit"] = url;
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
' "$CONFIG" "http://localhost:$PORT/r/{name}.json"

echo "▸ installing into the playground"
cd "$REPO/playground"

# `--overwrite` because the registry sources are the single source of truth and
# these installed files are disposable — a stale copy is the failure mode this
# script exists to prevent.
npx --yes shadcn@latest add \
  @slashkit/slash-command-editor \
  @slashkit/content-markdown-renderer \
  @slashkit/changelog \
  @slashkit/help-articles \
  @slashkit/blog \
  --yes --overwrite

echo "▸ done — $(find components/slashkit lib/slashkit -type f 2>/dev/null | wc -l | tr -d ' ') Slashkit files installed"
