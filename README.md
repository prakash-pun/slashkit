# Slashkit

A shadcn-style component registry for a `/` command editor and the renderers
that draw what it writes.

Not an npm package. Not a hosted service. You run `npx shadcn add` and get real
source files in your own project, which you then own and edit — the same
distribution model as shadcn/ui, for the same reason: an editor is exactly the
kind of component you always end up needing to change.

```bash
npx shadcn@latest add @slashkit/blog
```

**[Try it →](https://prakash-pun.github.io/slashkit/play/)** — a playground with
every block running live. Nothing on that page talks to a server, which is the
whole argument made in one demo.

---

## The one rule

**Nothing in this kit ever makes a network call.**

Every place content would need to be saved, loaded, or have media uploaded is a
**callback prop** instead. There is no `fetch`, no HTTP client, no database
client, no ORM, and no framework-specific import anywhere under `registry/`.

That is not an aspiration. It is enforced:

```bash
npm run check:no-network
```

The check also bans `next/*`, `react-router`, `@remix-run/*` and friends —
anywhere a component would otherwise need a `<Link>` or an `<Image>`, it takes a
render prop instead. This is what makes every item usable in literally any
stack: Next.js, a plain Vite SPA, a NestJS-backed app, anything.

The seams, all of them:

| You supply | Where | What it does |
| --- | --- | --- |
| `onUploadImage` | `defaultCommands`, `CoverImageUploader`, `ScreenshotDialogHost` | Turns a chosen file into a public URL |
| `onPromptVideoUrl` / `onPromptLinkUrl` / `onPromptLinkText` | `defaultCommands` | Asks for a URL. Defaults to `window.prompt`, validated |
| `configureLinkPreviews` | once, at app start | Resolves Open Graph metadata for a URL |
| `previews` | every renderer | Metadata resolved server-side, baked into static HTML |
| `onChange` / `onSave` | every editor | Hands you markdown or extracted rows. Persisting is yours |
| `renderLink` / `renderTitleLink` / `renderImage` | every list and card | Your framework's link and image components |
| `onSelect` / `onChange` | `DeviceToggle`, `EditorSidebarShell` | Your router, your state |

`createImagePicker` in `lib/slashkit/upload.ts` builds a conforming
`onUploadImage` from a single `upload(file)` function, if you want the file
picker half for free. It still never uploads anything itself.

---

## Install

### 1. Point at the registry

Add it to your `components.json`. Slashkit items depend on each other by
namespace, so this step is what makes `@slashkit/changelog` able to pull in
`@slashkit/slash-command-editor` behind it:

```json
{
  "registries": {
    "@slashkit": "https://prakash-pun.github.io/slashkit/r/{name}.json"
  }
}
```

That URL is published by
[the registry workflow](.github/workflows/registry.yml): every push to `main`
re-runs the no-network check, typechecks the sources, rebuilds `public/r/` and
deploys it to GitHub Pages. The built JSON is **never committed** — it exists
only as a build artefact, which is what makes it impossible for the published
registry to drift from the files in this repo.

To host your own fork instead, point any static file host at `public/r/` after
`npm run registry:build`. That directory is the entire registry.

### 2. Add what you want

```bash
# Standalone primitives — no feature assumed
npx shadcn@latest add @slashkit/slash-command-editor
npx shadcn@latest add @slashkit/content-markdown-renderer

# Composed blocks — a whole feature, ready to wire up
npx shadcn@latest add @slashkit/changelog
npx shadcn@latest add @slashkit/help-articles
npx shadcn@latest add @slashkit/blog
```

Files land under `components/slashkit/`, `lib/slashkit/`, `hooks/` and `types/`.

### 3. One manual step

`types/tiptap-markdown.d.ts` is installed for you but your `tsconfig.json` has
to actually include it. Most setups already glob `**/*.d.ts`; if yours doesn't,
add it. Without that file, `editor.storage.markdown` is a compile error —
see [Why `tiptap-markdown` needs a shim](#why-tiptap-markdown-needs-a-shim).

---

## What's in it

### Standalone primitives

| Item | What it is |
| --- | --- |
| `slashkit-lib` | Pure helpers everything else builds on — URL classification, markdown AST reading, heading ids, slugs, the platform-tagged image convention. No React, no dependencies. |
| `video-link-card` | The `[video](url)` card and the rich link preview card, with the whole degradation ladder: thumbnail → title → site → plain link. Plus the link-preview contract and cache. |
| `youtube-embed` | A facade player. Ships a thumbnail and a play button; the real iframe is only created on click, so scrolling past a video costs nothing. |
| `content-markdown-renderer` | The one renderer for everything the editor writes. |
| `slash-command-editor` | The canvas: `/` menu, insert button, selection toolbar, paste-to-embed chooser, and link cards drawn while you type. |
| `highlight-block` | A custom Tiptap node — icon, title, type, rich body — and the public list that renders the same palette. |
| `device-toggle` | Controlled, router-free segmented control for platform-tagged images. |
| `editor-sidebar-shell` | The entry list, the two-pane master/detail layout, and the sticky save bar. |
| `screenshot-dialog` | `/screenshot`: one validated description, N optional uploads, each tagged in its alt text. |
| `cover-image-uploader` | A page-level cover field — deliberately not a slash command. |
| `category-combobox` | Type anything, or pick one already in use. |
| `table-of-contents` | Derived from the document's own headings at render time. |

### Composed blocks

| Item | Adds |
| --- | --- |
| `changelog` | A whole release as one document of highlight blocks, structured extraction to a backend-ready array, and a stray-content warning. |
| `help-articles` | Article editor with per-platform screenshots and a canvas preview filter, plus the public categorized index. |
| `blog` | Rich-block-enabled post editor, the public post card, and SEO helpers for OG, Twitter Card, JSON-LD and category slugs. |

Both tiers are real and both are first-class. A block is a thin composition of
primitives, not a different kind of thing — `BlogPostEditor` is forty lines over
`SlashCommandEditor`, and the comment in it says so.

---

## What Slashkit owns, and what it refuses to

It owns **rich-content editing and rendering**. That is the whole scope.

It does not own your title field, slug, category, author, publish date,
draft/published status, save button, page layout, or the request that persists
any of it. Those are metadata your app models, and a component that guessed at
them would be wrong for every second app that installed it.

Every quick start below shows that boundary explicitly: the editor is one
element inside a form that is entirely yours.

---

## Quick starts

### Blog

```tsx
"use client";

import { useState } from "react";
import { BlogPostEditor } from "@/components/slashkit/blog-post-editor";
import { CoverImageUploader } from "@/components/slashkit/cover-image-uploader";
import { CategoryCombobox } from "@/components/slashkit/category-combobox";
import { createImagePicker } from "@/lib/slashkit/upload";
import { slugify } from "@/lib/slashkit/slug";

// Your upload. Slashkit never sees it.
const onUploadImage = createImagePicker({
  upload: async (file) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    return res.ok ? (await res.json()).url : null;
  },
  onRejected: () => toast.error("That image is over 5MB."),
});

export function PostEditor({ post, categories }) {
  // ── All of this is YOURS. Slashkit dictates no form. ──────────────────
  const [title, setTitle] = useState(post?.title ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [cover, setCover] = useState(post?.coverImageUrl ?? null);
  const [body, setBody] = useState(post?.body ?? "");

  return (
    <form onSubmit={(e) => { e.preventDefault(); save({ title, category, cover, body,
                                                        slug: slugify(title) }); }}>
      <CoverImageUploader value={cover} onChange={setCover}
                          onUploadImage={onUploadImage} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <CategoryCombobox value={category} onChange={setCategory}
                        suggestions={categories} />

      {/* ── …and this is the only part Slashkit owns. ─────────────────── */}
      <BlogPostEditor
        key={post?.id}                       // remount to load a different post
        body={post?.body}
        onChange={setBody}
        commandOptions={{ onUploadImage }}
      />

      <button type="submit">Save</button>
    </form>
  );
}
```

The public side:

```tsx
import { ContentMarkdownRenderer } from "@/components/slashkit/content-markdown-renderer";
import { TableOfContents } from "@/components/slashkit/table-of-contents";
import { extractHeadings } from "@/lib/slashkit/markdown-headings";
import { buildBlogSeoMetadata, buildBlogJsonLd, jsonLdScript }
  from "@/lib/slashkit/seo-helpers";

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  const seo = buildBlogSeoMetadata({ ...post, url: `https://site.com/blog/${post.slug}` });
  // A framework-agnostic shape — spread it, or map it to whatever yours wants.
  return { title: seo.title, description: seo.description,
           alternates: { canonical: seo.canonical },
           openGraph: seo.openGraph, twitter: seo.twitter };
}

export default async function Page({ params }) {
  const post = await getPost(params.slug);
  return (
    <article>
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: jsonLdScript(buildBlogJsonLd({ ...post, url })) }} />
      <TableOfContents headings={extractHeadings(post.body)} />
      <ContentMarkdownRenderer body={post.body} richBlocks />
    </article>
  );
}
```

`richBlocks` on both, or on neither. See [The `richBlocks`
pair](#the-richblocks-pair).

### Help articles

The one extra idea here is **platform-tagged screenshots**: the same
instructional step shown on a phone and in a browser, with the reader choosing.
There is no markdown syntax for that, so the tag rides in the alt text —
`![Tap the + button|ios](…)`. `parse-platform-alt.ts` is the whole contract.

```tsx
// Admin
<ScreenshotDialogHost onUploadImage={onUploadImage} />
<DeviceToggle current={preview} onChange={setPreview}
              options={[{ value: "both", label: "Both" }, ...DEFAULT_DEVICE_OPTIONS]} />
<HelpArticleEditor
  key={article?.id}
  body={article?.body}
  onChange={setBody}
  commandOptions={{ onUploadImage }}
  preview={preview}          // filters the CANVAS only — never what gets saved
/>
```

```tsx
// Public
const device = parseDevice(searchParams.device);   // yours: URL, cookie, state
{hasPlatformImages(article.body) && (
  <DeviceToggle current={device} onChange={(d) => router.replace(`?device=${d}`)} />
)}
<ContentMarkdownRenderer body={article.body} activePlatform={device} />
```

The toggle only appears when the body actually has tagged images — a switch that
visibly does nothing when clicked reads as broken, not as "nothing to switch".

And the index:

```tsx
<HelpArticleList
  articles={articles}
  renderLink={(a) => <Link href={`/help/${a.slug}`}>{a.title}</Link>}
/>
```

### Changelog

**This is the one that does not speak markdown**, and the difference is not
cosmetic. Read the next section before wiring it up.

```tsx
// Admin
const [highlights, setHighlights] = useState([]);
const [stray, setStray] = useState(0);

<ChangelogEditor
  key={release.id}
  highlights={release.highlights}        // as your API returned them
  onChange={setHighlights}               // ExtractedHighlight[], backend-ready
  onStrayContentChange={setStray}
  commandOptions={{ onUploadImage }}
/>

{stray > 0 && <p>{stray} block(s) outside a highlight will not be saved.</p>}

<button onClick={() => saveRelease(release.id, highlights)}>Save</button>
```

```tsx
// Public — the SAME component the admin preview uses, deliberately
<WhatsNewRelease
  heading={`Version ${release.version}`}
  meta={formatDate(release.publishedAt)}
  highlights={release.highlights}
/>
```

---

## Tiptap JSON vs. markdown strings

`HelpArticleEditor`, `BlogPostEditor` and the bare `SlashCommandEditor` all
speak **plain markdown strings**. `onChange` hands you the whole document as
markdown; hand it back as `body` to load it.

`ChangelogEditor` does **not**. It takes saved highlights and emits
`ExtractedHighlight[]`.

It has to. A `highlightBlock`'s `title`, `type` and `icon` are structured node
ATTRIBUTES with no markdown representation, so a flat `getMarkdown()` on that
document would silently drop all three. The body of each highlight is markdown;
the frame around it is not, and never can be.

That forces a second thing, which is worth understanding before you try to
simplify it. The obvious design is `onChange(editor.getJSON())` in the canvas
plus a pure `extractHighlights(json)` at the page level. **That cannot work.**
`tiptap-markdown`'s serializer walks real ProseMirror nodes — it needs the
schema, and every node's markdown spec off the extension manager — and
`getJSON()` returns inert plain objects with neither. Serializing one
highlight's body has to happen where the live `Editor` is. So the canvas hands
its parent finished highlights rather than a document the parent could not
interpret.

`strayBlockCount` exists for the corollary: the document's schema permits
top-level content that is not a highlight, and extraction drops it. Silently
losing what someone typed is the worst outcome available, so count it and say
so.

### Why `tiptap-markdown` needs a shim

`tiptap-markdown@0.9` exports exactly one thing — the `Markdown` extension.
There is no `generateMarkdown`, no standalone fragment serializer, nothing else:

```console
$ node -p "Object.keys(require('tiptap-markdown'))"
[ 'Markdown' ]
```

What does exist, at runtime, is `editor.storage.markdown` carrying
`serializer.serialize(fragment)` and `parser.parse(markdown)`. Those two are
what make per-block conversion possible without a second headless editor.
Neither is in the package's published types — hence
`types/tiptap-markdown.d.ts`, which also merges `MarkdownStorage` into Tiptap
v3's `Storage` interface (upstream never did, so even the documented
`getMarkdown()` is a compile error without it).

The package is explicitly unmaintained — its own README points at Tiptap's paid
Conversion extension. Treat this as a pinned-version arrangement and re-verify
if you upgrade.

---

## Things worth knowing

### The `richBlocks` pair

Blockquotes, dividers and checklists are **off by default**, and the editor flag
and the renderer flag must always match:

```tsx
<BlogPostEditor            richBlocks />   // can PRODUCE them
<ContentMarkdownRenderer   richBlocks />   // can DRAW them
```

Turn one on without the other and an author writes content that renders as
nothing — a `- [ ] task` that shows up as the literal text `[ ]`.

The default is off because a body is usually parsed by more than one thing: a
mobile client, a feed reader, a search indexer. A construct that draws in your
web renderer and nowhere else is worse than one nobody can write, because nobody
finds out until it has shipped. `blog` turns it on because a marketing post
typically has exactly one consumer.

### The markdown subset is enforced twice

`markdownExtensions` is deliberately **subtractive** — it switches StarterKit's
code, code blocks, ordered lists, strike, italic and underline off. That is not
tidiness. Each of those carries an INPUT RULE, so typing `` ``` `` produces a
code block whether or not a slash command offers one. Restricting the `/` menu
alone does nothing.

So the guard is in two halves that must move together: the command list not
containing it, and the schema not having it. If you widen one, widen the other.

### Link previews

Rich cards need Open Graph metadata from someone else's server. Scraping it is a
server job — SSRF protection, timeouts, caching, CORS — and none of that belongs
in a copied component. So:

- **On a page**, resolve previews yourself and pass a `PreviewMap` as `previews`.
  The cards become part of your static HTML: no client request, no spinner, no
  cards popping in after paint. `collectPreviewableHrefs(bodies)` tells you which
  hrefs are worth resolving (whole-line links only — an inline link stays inline,
  so there is nothing to preview).
- **In the editor**, where the author is typing URLs no server render could have
  anticipated, register a resolver once:

  ```ts
  configureLinkPreviews(async (href) => {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(href)}`);
    return res.ok ? res.json() : null;
  });
  ```

Register nothing and every card degrades to a plain link. That is a supported
state everywhere, not a broken one.

### The editor is the preview

There is no separate preview panel anywhere in this kit, on purpose. A highlight
block in the editor is styled from the same tokens `WhatsNewList` uses. A
whole-line link is drawn as a card while you type, by `LinkMarkView`, using the
same "is it alone on its line?" and "is the label exactly `video`?" rules the
public renderer applies.

That is why `highlight-style.ts` exports tokens rather than a component: the two
surfaces are genuinely different technically — an interactive ProseMirror node
view versus static server-rendered markup — and forcing them through one
component would fight both. Sharing the palette means a colour change lands on
both by construction rather than by remembering to.

### Customising

- **Slash commands** — build your own `SlashCommandItem[]`. `defaultCommands`,
  `richBlockCommands`, `screenshotCommand` and `highlightCommand` are ingredients,
  not a fixed menu.
- **The menu itself** — `components/slashkit/slash-command-list.tsx` is a real
  file in your project. Edit it. (Slashkit ships a working menu rather than a
  `renderMenu` callback contract, because in a copy-the-source registry the file
  *is* the seam, and a finished menu with keyboard handling, Escape dismissal and
  hover/scroll behaviour is a lot to ask someone to rebuild.)
- **Highlight types** — edit `HIGHLIGHT_TYPE_STYLES`. Both the editor's `<select>`
  and the public list read it, so a new type appears in both at once.
- **The emoji picker** — `HighlightBlock.configure({ renderIconPicker })`. The
  default is a plain one-character input, which works with every OS emoji
  keyboard and costs no dependency.
- **Platform tags** — every function takes `platformTags`. `["ios", "web"]` is
  only the default.

---

## Verification

```bash
npm run check:no-network   # the one rule, enforced
npm run typecheck          # the registry sources, against consumer aliases
npm run registry:build     # writes public/r/*.json
npm run verify             # the full §8 checklist, end to end

cd playground
npm run sync               # shadcn add, from the registry you just built
npm run dev                # run the editors for real
```

The first three also run in CI on every push and pull request, and a failure
blocks the publish. `typecheck` resolves the `@/` aliases against this repo's
layout using `tsconfig.json` paths plus the stubs in
[`typecheck/`](typecheck/README.md) — fast feedback without a full install.
`verify` is the one that checks against the *real* shadcn/ui components.

`npm run verify` scaffolds a throwaway app, serves the built registry over HTTP,
installs all three blocks through the real `shadcn add`, typechecks every
installed file, then runs the changelog round trip and the renderer assertions
in jsdom against the files shadcn actually wrote.

Current status — all green:

- 48 files install cleanly (42 Slashkit + 6 shadcn/ui primitives it pulled in)
  with the dependency graph resolved
- 0 TypeScript errors under `strict`, against Tiptap 3.30 / React 19 /
  react-markdown 10
- 43 runtime assertions pass, covering the highlight round trip (bold, bullets,
  the video convention, icon pairing, sort order, stray-block counting), the
  public render, the platform-alt parser's edge cases, and every
  `stripMarkdown` leak it was written to prevent

### The playground is part of the verification

`playground/` is not a marketing page bolted on afterwards — it is where the
browser-only behaviour gets proven, and CI fails if it does not build. jsdom
cannot exercise floating-ui positioning (no layout), ProseMirror selection
through a `mousedown`, `MutationObserver`-driven link cards, `flushSync` during
node-view mount, or a real paste event. All of those have now been driven in a
real browser:

- the `/` menu opens, filters as you type, runs on Enter, and deletes its own
  `/query` text
- `1/2` does **not** open it — the mid-word guard holds
- Escape dismisses it and it stays dismissed while the query still matches
- pasting a URL offers the chooser, and offers Image only for a URL that could
  plausibly be one
- highlight node views mount, `/highlight` inserts after the enclosing block
  rather than nesting, and editing a title updates the public column live
- the platform filter shows one screenshot per platform, with the description —
  not the tag — as its alt text
- the YouTube facade ships no iframe until it is clicked

The playground installs through the real `shadcn add`, against the registry
built from the current commit rather than the published one. So if a demo works,
the install path worked.

---

## Deliberate deviations from a naive port

Worth stating plainly, because each was a decision rather than an oversight:

- **Tiptap v3, not v2.** `ReactMarkViewRenderer`, `@tiptap/react/menus` and
  `setContent(…, { emitUpdate: false })` are all v3. The link-as-you-type card is
  not buildable on v2.
- **`@floating-ui/dom`, not tippy.js.** tippy is unmaintained and pulls in
  Popper 2; floating-ui is its successor and is what Radix — and therefore
  shadcn/ui — already uses, so you very likely have it. The positioning code is
  thirteen lines if you disagree.
- **A real `/` menu component instead of a `renderMenu` contract.** See
  *Customising* above.
- **`parse-platform-alt.ts` lives in `slashkit-lib`.** Both the editor (writing
  tags) and the renderer (reading them) need it, and putting it in either one
  would make the two primitives depend on each other — which the standalone-tier
  promise forbids.

---

## Out of scope, by design

- Any backend, database schema, or API route.
- A data-fetching layer. `getPost`, `getArticles` and friends in the examples
  are yours.
- Anything non-web.

---

## License

MIT — see [LICENSE](LICENSE). Copy the files, change them, ship them.
