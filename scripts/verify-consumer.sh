#!/usr/bin/env bash
#
# The §8 verification checklist, end to end, against a FRESH app.
#
#   1. builds the registry
#   2. serves it over HTTP (shadcn registries must be URLs, not paths)
#   3. scaffolds a bare consumer app and installs all three blocks from it
#   4. typechecks every installed file
#   5. runs the changelog round trip and the renderer assertions in jsdom
#
# Everything happens in a scratch directory that is removed at the end.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
PORT="${SLASHKIT_PORT:-8231}"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    # Silenced: bash announces a killed background job on stderr otherwise,
    # which reads like a failure at the end of a successful run.
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

step "no-network rule"
node "$REPO/scripts/check-no-network.mjs"

step "building the registry"
(cd "$REPO" && npx shadcn build >/dev/null && echo "  ✓ public/r written")

step "serving it on :$PORT"
(cd "$REPO/public" && npx --yes http-server -p "$PORT" -s --cors >/dev/null 2>&1) &
SERVER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/r/registry.json" >/dev/null && break
  sleep 1
done
echo "  ✓ reachable"

step "scaffolding a fresh consumer app"
mkdir -p "$WORK/app" "$WORK/lib"
cat > "$WORK/package.json" <<'JSON'
{ "name": "slashkit-consumer", "private": true, "version": "0.0.0", "type": "module" }
JSON
cat > "$WORK/components.json" <<JSON
{
  "\$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york", "rsc": true, "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide",
  "registries": { "@slashkit": "http://localhost:$PORT/r/{name}.json" }
}
JSON
cat > "$WORK/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["DOM","DOM.Iterable","ES2022"], "jsx": "react-jsx",
    "module": "ESNext", "moduleResolution": "Bundler", "strict": true, "noEmit": true,
    "skipLibCheck": true, "esModuleInterop": true, "allowSyntheticDefaultImports": true,
    "isolatedModules": true, "baseUrl": ".", "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
JSON
echo '@import "tailwindcss";' > "$WORK/app/globals.css"
# What `shadcn init` would normally have written.
cat > "$WORK/lib/utils.ts" <<'TS'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
TS
echo "  ✓ $WORK"

step "installing the three blocks"
(cd "$WORK" && npx --yes shadcn@latest add @slashkit/changelog @slashkit/help-articles @slashkit/blog --yes >/dev/null)
echo "  ✓ $(find "$WORK/components/slashkit" "$WORK/lib/slashkit" -type f | wc -l | tr -d ' ') Slashkit files installed"

step "installing what an app brings itself"
(cd "$WORK" && npm install --silent --no-audit --no-fund \
  react@^19 react-dom@^19 clsx tailwind-merge class-variance-authority \
  typescript@^5 @types/react@^19 @types/react-dom@^19 jsdom tsx >/dev/null 2>&1)
echo "  ✓ done"

step "typechecking every installed file"
(cd "$WORK" && npx tsc --noEmit) && echo "  ✓ no type errors"

step "running the changelog round trip in jsdom"
cp "$REPO/scripts/verify-consumer.tsx" "$WORK/verify.tsx"
(cd "$WORK" && npx tsx verify.tsx)
