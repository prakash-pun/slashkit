#!/usr/bin/env node
/**
 * The one rule that governs every file in this project, enforced.
 *
 * Nothing under `registry/` may make a network call, talk to a database, or
 * reach for a server-only API. Every such place is a callback prop instead —
 * that is what makes each item usable in any stack.
 *
 * Run with `npm run check:no-network`. Exits non-zero on a violation.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REGISTRY = join(ROOT, "registry");

/**
 * Each rule is a regex plus what to do instead.
 *
 * `<img src>` and `<iframe src>` are deliberately NOT violations: the browser
 * loads those, the component does not request them, and a renderer that could
 * not show a picture would be useless. The line is code that initiates a
 * request.
 */
const RULES = [
  {
    name: "fetch()",
    pattern: /(?<![.\w])fetch\s*\(/,
    instead: "take a callback prop (onUploadImage, a link-preview resolver)",
  },
  {
    name: "XMLHttpRequest",
    pattern: /\bXMLHttpRequest\b/,
    instead: "take a callback prop",
  },
  {
    name: "WebSocket / EventSource",
    pattern: /\bnew\s+(WebSocket|EventSource)\b/,
    instead: "take a callback prop",
  },
  {
    name: "navigator.sendBeacon",
    pattern: /\bnavigator\s*\.\s*sendBeacon\b/,
    instead: "take a callback prop",
  },
  {
    name: "an HTTP client",
    pattern: /from\s+["'](axios|got|ky|node-fetch|undici|superagent|swr|@tanstack\/react-query|@apollo\/client|graphql-request)["']/,
    instead: "take a callback prop — the consumer owns their data layer",
  },
  {
    name: "a database or ORM client",
    pattern: /from\s+["'](@prisma\/client|prisma|drizzle-orm|mongoose|typeorm|kysely|pg|mysql2|better-sqlite3|@supabase\/supabase-js|firebase[/\w-]*)["']/,
    instead: "nothing — Slashkit has no backend by design",
  },
  {
    name: "a server-only Node API",
    pattern: /from\s+["'](node:|fs|path|http|https|dns|net|crypto$)/,
    instead: "keep registry files isomorphic",
  },
  {
    name: "a framework-specific import",
    pattern: /from\s+["'](next\/|react-router|@remix-run\/|@tanstack\/react-router)/,
    instead: "take a render prop (renderLink, renderImage) so any framework fits",
  },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(full)) yield full;
  }
}

/** Strips comments so a rule named in prose is not reported as a violation. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const violations = [];

for (const file of walk(REGISTRY)) {
  const code = stripComments(readFileSync(file, "utf8"));

  code.split("\n").forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relative(ROOT, file),
          line: i + 1,
          rule: rule.name,
          instead: rule.instead,
          source: line.trim(),
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log("✓ no network, database or framework calls under registry/");
  process.exit(0);
}

console.error(`✗ ${violations.length} violation(s) of the no-network rule:\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.rule}`);
  console.error(`    ${v.source}`);
  console.error(`    → instead: ${v.instead}\n`);
}
process.exit(1);
