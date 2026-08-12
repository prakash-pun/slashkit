#!/usr/bin/env node
/**
 * Did Tailwind actually scan the Slashkit components?
 *
 * ── Why this check exists ──────────────────────────────────────────────────
 * The playground's Slashkit files are gitignored — `playground-sync.sh` is the
 * only thing that writes them — and Tailwind v4's automatic source detection
 * SKIPS anything .gitignore'd. So the build kept succeeding, the page kept
 * rendering, and every editor, menu and card on it was completely unstyled.
 * Nothing failed. It shipped that way.
 *
 * `@source` directives in `globals.css` are the fix. This is what makes sure
 * they keep working: a green build that silently drops half the stylesheet is
 * exactly the failure a build is supposed to catch.
 *
 * Run after `next build`, from the repo root or the playground directory.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS_DIR = join(ROOT, "playground/out/_next/static/chunks");

/**
 * Classes that appear ONLY inside the synced Slashkit files, never in the
 * playground's own committed chrome — so each one is a genuine probe of
 * whether that directory was scanned.
 *
 * Kept small and specific on purpose. A long list would break every time a
 * component changed a utility; these are structural.
 */
const PROBES = [
  // components/slashkit — the slash menu, the cards, the editors
  { cls: "bg-popover", from: "slash-command-list.tsx" },
  { cls: "text-primary-foreground", from: "slash-command-list.tsx" },
  { cls: "#EEEDFE", from: "highlight-style.ts (arbitrary value)" },
  // lib/slashkit — CANVAS_PROSE and the renderer prose strings, which is where
  // most of a rendered body's classes come from
  { cls: "list-decimal", from: "markdown-editor.ts CANVAS_PROSE" },
  { cls: "underline-offset-2", from: "CANVAS_PROSE / renderer prose" },
];

if (!existsSync(CSS_DIR)) {
  console.error(`::error::no build output at ${CSS_DIR} — run next build first`);
  process.exit(1);
}

const files = readdirSync(CSS_DIR).filter((f) => f.endsWith(".css"));
if (files.length === 0) {
  console.error("::error::the build produced no CSS at all");
  process.exit(1);
}

const css = files.map((f) => readFileSync(join(CSS_DIR, f), "utf8")).join("\n");

const missing = PROBES.filter(({ cls }) => !css.includes(cls));

if (missing.length > 0) {
  console.error(
    "::error::Tailwind did not scan the Slashkit components — the playground " +
      "would render unstyled.",
  );
  console.error("");
  for (const { cls, from } of missing) {
    console.error(`  missing: ${cls}   (from ${from})`);
  }
  console.error("");
  console.error(
    "  Almost certainly the `@source` lines in playground/app/globals.css.\n" +
      "  Tailwind v4 skips .gitignore'd files, and the Slashkit components are\n" +
      "  gitignored on purpose — `@source` is what overrides that.",
  );
  process.exit(1);
}

const kb = Math.round(css.length / 1024);
console.log(`✓ Tailwind scanned the Slashkit components (${kb}kB of CSS, ${PROBES.length} probes)`);
