/**
 * Checklist §8 item 3: install `changelog`, save a release with 2+ highlights,
 * and render it via WhatsNewList with matching output.
 *
 * Runs the REAL installed files — the ones shadcn copied in — against a real
 * ProseMirror document in jsdom.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(g, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.DOMParser = dom.window.DOMParser;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) =>
  dom.window.setTimeout(() => cb(0), 0) as unknown as number;
g.cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id);

const { Editor } = await import("@tiptap/core");
const { renderToStaticMarkup } = await import("react-dom/server");
const React = await import("react");

const { markdownExtensions } = await import("./lib/slashkit/markdown-editor");
const { HighlightBlock } = await import("./lib/slashkit/highlight-block-node");
const { highlightCommand } = await import("./lib/slashkit/highlight-command");
const { defaultCommands } = await import("./lib/slashkit/commands");
const { docToHighlights, highlightsToDoc, strayBlockCount } = await import(
  "./lib/slashkit/extract-highlights"
);
const { collectPreviewableHrefs } = await import("./lib/slashkit/collect-links");
const { WhatsNewList } = await import("./components/slashkit/whats-new-list");
const { stripMarkdown, excerptFrom } = await import(
  "./lib/slashkit/strip-markdown"
);
const { buildBlogJsonLd, postDescription } = await import(
  "./lib/slashkit/seo-helpers"
);
const { parsePlatformAlt, buildPlatformAlt, hasPlatformImages } = await import(
  "./lib/slashkit/parse-platform-alt"
);

let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}`);
  if (!ok) {
    failures += 1;
    if (detail !== undefined) console.log("      got:", detail);
  }
};

// ── A release with three highlights, as it would come back from an API ──────
const saved = [
  {
    title: "Trip budgets",
    body: "Set a **budget** per trip.\n\n- Track as you go\n- Roll over what you don't spend\n\n[video](https://youtu.be/abc123)",
    type: "feature",
    icon: "🧳",
    iconType: "EMOJI",
  },
  {
    title: "Faster sync",
    body: "Accounts refresh in about half the time.",
    type: "improvement",
    icon: null,
    iconType: null,
  },
  {
    title: "Fixed duplicate tags",
    body: "Tags no longer duplicate after an offline edit.",
    type: "fix",
    icon: null,
    iconType: null,
  },
];

const commands = [
  highlightCommand,
  ...defaultCommands({ onUploadImage: async () => null }),
];

const editor = new Editor({
  element: dom.window.document.body,
  extensions: [...markdownExtensions(commands), HighlightBlock],
});

console.log("\nchangelog round trip");

editor.commands.setContent(highlightsToDoc(editor, saved), {
  emitUpdate: false,
});

const extracted = docToHighlights(editor);

check(`extracts ${saved.length} highlights`, extracted.length === saved.length, extracted.length);
check(
  "titles survive",
  extracted.map((h) => h.title).join("|") === saved.map((h) => h.title).join("|"),
  extracted.map((h) => h.title),
);
check(
  "types survive",
  extracted.map((h) => h.type).join("|") === "feature|improvement|fix",
  extracted.map((h) => h.type),
);
check(
  "sortOrder is document order",
  extracted.map((h) => h.sortOrder).join(",") === "0,1,2",
  extracted.map((h) => h.sortOrder),
);
check(
  "icon + iconType stay an all-or-nothing pair",
  extracted[0].icon === "🧳" &&
    extracted[0].iconType === "EMOJI" &&
    extracted[1].icon === undefined &&
    extracted[1].iconType === undefined,
  [extracted[0].icon, extracted[0].iconType, extracted[1].icon],
);
check("bold survives the round trip", extracted[0].body.includes("**budget**"), extracted[0].body);
check("bullets survive", extracted[0].body.includes("- Track as you go"), extracted[0].body);
check(
  "the [video](…) convention survives",
  /\[video\]\(https:\/\/youtu\.be\/abc123\)/.test(extracted[0].body),
  extracted[0].body,
);
check("a clean release reports no stray blocks", strayBlockCount(editor) === 0, strayBlockCount(editor));

// A stray top-level paragraph must be COUNTED, not silently dropped.
editor.commands.insertContentAt(editor.state.doc.content.size, {
  type: "paragraph",
  content: [{ type: "text", text: "orphan note" }],
});
check("a stray top-level block is reported", strayBlockCount(editor) === 1, strayBlockCount(editor));
check(
  "…and is still excluded from the saved highlights",
  docToHighlights(editor).length === 3,
  docToHighlights(editor).length,
);

// ── Rendering the same highlights publicly ──────────────────────────────────
console.log("\nWhatsNewList render");

const html = renderToStaticMarkup(
  React.createElement(WhatsNewList, { highlights: extracted }),
);

// 3 highlight rows + the 2 bullets inside the first one's body.
check("renders one <li> per highlight", (html.match(/<li class="flex gap-4"/g) ?? []).length === 3, html.match(/<li/g)?.length);
check("shows every title", saved.every((h) => html.includes(h.title)));
check("uses the authored emoji where set", html.includes("🧳"), html.slice(0, 200));
check("falls back to the type emoji where unset", html.includes("⚡") && html.includes("🔧"));
check("bold renders as <strong>", html.includes("<strong"), true);
check("bullets render as a list", html.includes("<ul") && html.includes("<li>Track as you go</li>"));
// A YouTube URL becomes the inline facade player; anything else would fall
// through to VideoLinkCard's "Watch video".
check(
  "a YouTube [video](…) becomes the inline facade, not a bare link",
  html.includes("i.ytimg.com/vi/abc123") && html.includes("Play video") &&
    !html.includes(">video</a>"),
  html.slice(html.indexOf("abc123") - 200, html.indexOf("abc123") + 100),
);
check(
  "type tints differ per highlight",
  html.includes("#EEEDFE") && html.includes("#E1F5EE") && html.includes("#FAECE7"),
);

// ── The link-collection helper the previews path depends on ─────────────────
console.log("\nlink collection");
const hrefs = collectPreviewableHrefs(extracted.map((h) => h.body));
check("finds the whole-line video link", hrefs.includes("https://youtu.be/abc123"), hrefs);
check("and nothing else", hrefs.length === 1, hrefs);

// ── Pure helpers ────────────────────────────────────────────────────────────
console.log("\nplatform alt convention");
check(
  "pipe form splits",
  JSON.stringify(parsePlatformAlt("Tap the + button|ios")) ===
    JSON.stringify({ tag: "ios", displayAlt: "Tap the + button" }),
  parsePlatformAlt("Tap the + button|ios"),
);
check(
  "bare legacy form still parses",
  parsePlatformAlt("web").tag === "web" && parsePlatformAlt("web").displayAlt === "",
);
check(
  "a description that merely mentions a platform is NOT a tag",
  parsePlatformAlt("iOS Screenshot").tag === null &&
    parsePlatformAlt("web app").tag === null,
);
check(
  "a description may contain a pipe",
  parsePlatformAlt("Choose A|B|ios").displayAlt === "Choose A|B",
  parsePlatformAlt("Choose A|B|ios"),
);
check(
  "an unknown trailing segment is left alone",
  parsePlatformAlt("Chart|2026").tag === null &&
    parsePlatformAlt("Chart|2026").displayAlt === "Chart|2026",
);
check(
  "build/parse round trip",
  parsePlatformAlt(buildPlatformAlt("Tap [here]", "ios")).tag === "ios",
  buildPlatformAlt("Tap [here]", "ios"),
);
check("bracket characters are stripped, not escaped", !buildPlatformAlt("a [b] c", "web").includes("["));
check(
  "hasPlatformImages sees a tagged image",
  hasPlatformImages("![Budgets tab|ios](https://x.test/a.png)") === true,
);
check(
  "…and not an untagged one",
  hasPlatformImages("![A chart](https://x.test/a.png)") === false,
);

console.log("\nstripMarkdown leak prevention");
check(
  "an image URL never reaches a description",
  !stripMarkdown("![Budgets|ios](https://cdn.test/a.png)\n\nReal prose here.").includes("cdn.test"),
  stripMarkdown("![Budgets|ios](https://cdn.test/a.png)\n\nReal prose here."),
);
check(
  "a pasted autolink never reaches a description",
  !stripMarkdown("Look: <https://example.test/x>\n\nReal prose.").includes("example.test"),
  stripMarkdown("Look: <https://example.test/x>\n\nReal prose."),
);
check(
  "a [video](…) marker goes whole",
  stripMarkdown("[video](https://youtu.be/x)\n\nProse.").trim() === "Prose.",
  stripMarkdown("[video](https://youtu.be/x)\n\nProse."),
);
check(
  "an ordinary link keeps its label",
  stripMarkdown("Read the [full guide](https://x.test) for detail.") ===
    "Read the full guide for detail.",
  stripMarkdown("Read the [full guide](https://x.test) for detail."),
);
check(
  "hyphens and underscores in words survive",
  stripMarkdown("well-known snake_case values") === "well-known snake_case values",
  stripMarkdown("well-known snake_case values"),
);
check("excerpt cuts on a word boundary", !/\s\S+…$/.test(excerptFrom("a ".repeat(200), 40)) === false || excerptFrom("word ".repeat(50), 40).endsWith("…"));

// ── The wider vocabulary ────────────────────────────────────────────────────
console.log("\nvocabulary renders");

const { ContentMarkdownRenderer } = await import(
  "./components/slashkit/content-markdown-renderer"
);
const draw = (body: string) =>
  renderToStaticMarkup(React.createElement(ContentMarkdownRenderer, { body }));

const vocab = draw(
  "1. one\n2. two\n\n> quoted\n\n---\n\n`code` and ~~struck~~ and *em*",
);
check("ordered list", /<ol/.test(vocab));
check("blockquote", /<blockquote/.test(vocab));
check("divider", /<hr/.test(vocab));
check("inline code", /<code/.test(vocab));
check("strikethrough — needs GFM, now unconditional", /<del/.test(vocab));
check("emphasis", /<em/.test(vocab));

const allowed = draw(
  "<details open>\n<summary>Q</summary>\n\nAn **answer** with <u>underline</u>.\n\n</details>",
);
check("collapsible section survives", /<details/.test(allowed));
check("…keeping its open attribute", /open/.test(allowed));
check("…and its summary", /<summary/.test(allowed));
check("underline survives", /<u>/.test(allowed));
check(
  "markdown INSIDE a collapsible section still parses",
  /<strong/.test(allowed),
  allowed.includes("<strong") ? undefined : "not parsed as markdown",
);

// ── The sanitizer ───────────────────────────────────────────────────────────
//
// `rehype-raw` is what draws `<u>` and `<details>`. Without `rehype-sanitize`
// behind it every body is a stored-XSS vector, so the allowlist is load
// bearing — and a claim about it is only worth making if it is tested.
console.log("\nhostile HTML is filtered");

const script = draw("Hello\n\n<script>alert(1)</script>\n\nWorld");
check("a <script> tag is dropped entirely", !/<script/i.test(script));
check(
  "…and the prose around it is untouched",
  script.includes("Hello") && script.includes("World"),
);
check(
  "an inline event handler is stripped",
  !/onerror/i.test(draw('<img src="x" onerror="alert(1)">')),
);
check(
  "a stray <iframe> is dropped",
  !/<iframe/i.test(draw('<iframe src="https://evil.test"></iframe>')),
);
check(
  "a javascript: href is neutralised",
  !/javascript:/i.test(draw('<a href="javascript:alert(1)">click</a>')),
);

console.log("\nblog SEO");
const jsonLd = buildBlogJsonLd({
  title: "Five ways to budget",
  body: "![cover](https://cdn.test/c.png)\n\nBudgeting is a habit, not a spreadsheet.",
  url: "https://site.test/blog/five-ways",
  authorName: "Ada",
  publishedAt: "2026-01-02T00:00:00.000Z",
  siteName: "My Site",
});
check("JSON-LD is a BlogPosting", jsonLd["@type"] === "BlogPosting");
check(
  "its description is derived prose, not markdown",
  String(jsonLd.description).startsWith("Budgeting is a habit"),
  jsonLd.description,
);
check("no image key when there is no cover", !("image" in jsonLd), Object.keys(jsonLd));
check("dateModified falls back to datePublished", jsonLd.dateModified === "2026-01-02T00:00:00.000Z");
check(
  "an explicit excerpt always wins",
  postDescription({
    title: "t",
    body: "derived text",
    excerpt: "hand written",
    url: "https://x.test",
  }) === "hand written",
);

editor.destroy();

console.log(
  failures === 0
    ? "\n✓ all checks passed"
    : `\n✗ ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
