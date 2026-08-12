import type { Editor, JSONContent } from "@tiptap/core";
import { DOMParser as PMDOMParser, type Node as PMNode } from "@tiptap/pm/model";

import {
  DEFAULT_HIGHLIGHT_TYPE,
  HIGHLIGHT_TYPES,
} from "@/lib/slashkit/highlight-style";

/**
 * Conversion between the editor document and the flat highlight array an API
 * takes.
 *
 * ── Why this needs a live Editor, and not plain JSON ───────────────────────
 * The obvious shape would be `onChange(editor.getJSON())` in the canvas and a
 * pure `extractHighlights(json)` at the page level. That cannot work:
 * `tiptap-markdown`'s serializer walks real ProseMirror nodes — it needs the
 * schema, and every node's markdown spec off the extension manager — and
 * `getJSON()` returns inert plain objects with neither. Serializing a
 * highlight's body therefore has to happen where the Editor is, which is why
 * the canvas hands its parent finished highlights rather than a document the
 * parent could not interpret.
 *
 * ── The API this uses, verified rather than assumed ────────────────────────
 * `tiptap-markdown@0.9` exports exactly ONE thing: the `Markdown` extension.
 * There is no `generateMarkdown`, no fragment serializer, nothing else — check
 * with `node -p "Object.keys(require('tiptap-markdown'))"` if you doubt it.
 * What DOES exist is `editor.storage.markdown`, whose runtime shape carries
 * `serializer.serialize(fragment)` and `parser.parse(markdown)`. Those two are
 * what make it possible to convert one block's body without spinning up a
 * second headless editor. Neither is in the package's published types, which is
 * what `tiptap-markdown.d.ts` is for — install that file or none of this
 * compiles.
 *
 * The package is unmaintained (its README points at Tiptap's paid Conversion
 * extension), so treat this as a pinned-version arrangement and re-verify if
 * you upgrade.
 */

/** What the canvas reports upward — one row, ready to persist. */
export interface ExtractedHighlight {
  title: string;
  /** Markdown, restricted to what the node's content expression allows. */
  body: string;
  type: string;
  icon?: string;
  iconType?: string;
  /**
   * Position in the document, assigned by `docToHighlights`.
   *
   * Document order IS the order, which is what makes dragging a block or
   * inserting one mid-release do the obvious thing without a separate
   * reordering control.
   */
  sortOrder: number;
}

const isKnownType = (value: string) => HIGHLIGHT_TYPES.includes(value);

/** A body must hold at least one block — the node's content expression is `+`. */
const EMPTY_BODY: JSONContent[] = [{ type: "paragraph" }];

/**
 * Markdown → ProseMirror content JSON.
 *
 * `parser.parse` hands back an HTML STRING rather than nodes, so the result is
 * run through ProseMirror's own DOM parser against the live schema. Anything
 * the schema does not allow inside a highlight (a table, a code block) is
 * dropped here rather than throwing — the same subset guarantee the node's
 * content expression makes, applied on the way in.
 */
function markdownToContent(editor: Editor, markdown: string): JSONContent[] {
  if (!markdown.trim()) return EMPTY_BODY;

  const html = editor.storage.markdown.parser.parse(markdown);
  if (typeof html !== "string") return EMPTY_BODY;

  const element = document.createElement("div");
  element.innerHTML = html;

  const parsed = PMDOMParser.fromSchema(editor.schema).parse(element);
  const content = parsed.toJSON().content as JSONContent[] | undefined;

  return content?.length ? content : EMPTY_BODY;
}

/**
 * ProseMirror content → markdown, scoped to a single highlight's body.
 *
 * Passes the block's `content` Fragment, NOT the block itself — serializing the
 * node would try to find a markdown spec for `highlightBlock`, which has none,
 * and fall through to the raw-HTML serializer.
 */
function contentToMarkdown(editor: Editor, node: PMNode): string {
  return editor.storage.markdown.serializer.serialize(node.content).trim();
}

/** What `highlightsToDoc` needs. A subset of `ExtractedHighlight`. */
export interface StoredHighlight {
  title: string;
  body: string;
  type: string;
  icon?: string | null;
  iconType?: string | null;
}

/** A saved release → the document the canvas mounts with. */
export function highlightsToDoc(
  editor: Editor,
  highlights: StoredHighlight[],
): JSONContent {
  const blocks = highlights.map((highlight) => ({
    type: "highlightBlock",
    attrs: {
      title: highlight.title,
      type: isKnownType(highlight.type)
        ? highlight.type
        : DEFAULT_HIGHLIGHT_TYPE,
      icon: highlight.icon ?? null,
      iconType: highlight.iconType ?? null,
    },
    content: markdownToContent(editor, highlight.body),
  }));

  return {
    type: "doc",
    // A brand-new release opens on one empty block rather than a bare
    // paragraph, so the first thing to type into is a highlight title.
    content: blocks.length ? blocks : [emptyHighlightBlock()],
  };
}

export const emptyHighlightBlock = (): JSONContent => ({
  type: "highlightBlock",
  attrs: {
    title: "",
    type: DEFAULT_HIGHLIGHT_TYPE,
    icon: null,
    iconType: null,
  },
  content: EMPTY_BODY,
});

/** The document → the highlights to save, in document order. */
export function docToHighlights(editor: Editor): ExtractedHighlight[] {
  const highlights: ExtractedHighlight[] = [];

  editor.state.doc.forEach((node) => {
    if (node.type.name !== "highlightBlock") return;

    const type = (node.attrs.type as string) ?? DEFAULT_HIGHLIGHT_TYPE;
    const icon = (node.attrs.icon as string | null)?.trim();

    highlights.push({
      title: ((node.attrs.title as string) ?? "").trim(),
      body: contentToMarkdown(editor, node),
      type: isKnownType(type) ? type : DEFAULT_HIGHLIGHT_TYPE,
      // All-or-nothing pair — a half-set icon is what a validator on the other
      // end rejects.
      ...(icon
        ? { icon, iconType: (node.attrs.iconType as string | null) ?? "EMOJI" }
        : {}),
      sortOrder: highlights.length,
    });
  });

  return highlights;
}

/**
 * Top-level content that is NOT a highlight block.
 *
 * The document permits it — `doc` is `block+` — but a highlight-shaped API has
 * nowhere to put it, so `docToHighlights` drops it. Silently losing what
 * someone typed is the worst outcome available here, so count it and SAY so
 * rather than discarding it at save time without a word.
 */
export function strayBlockCount(editor: Editor): number {
  let stray = 0;

  editor.state.doc.forEach((node) => {
    if (node.type.name === "highlightBlock") return;
    // An empty trailing paragraph is what ProseMirror leaves behind constantly
    // (clicking below the last block, pressing Enter out of one); warning about
    // it would make the notice permanent and therefore ignorable.
    if (node.textContent.trim() === "" && node.childCount === 0) return;
    stray += 1;
  });

  return stray;
}
