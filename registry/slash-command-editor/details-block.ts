import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { DetailsBlockView } from "@/components/slashkit/details-block-view";

/**
 * A collapsible section — summary line plus hidden content.
 *
 * ── Why this one is HTML on the wire ───────────────────────────────────────
 * Markdown has no collapse syntax. None. The convention every renderer that
 * supports it has settled on is literal `<details><summary>` HTML, which is
 * what GitHub, GitLab and most static site generators accept, so that is what
 * this serialises to:
 *
 *     <details>
 *     <summary>How do refunds work?</summary>
 *
 *     Refunds land in 5–10 days.
 *
 *     </details>
 *
 * The blank lines are load-bearing. Without one after `</summary>` the content
 * is treated as raw HTML rather than markdown, and the bold and links inside it
 * stop rendering — that is the single most common way a hand-written `<details>`
 * block comes out wrong, and the serializer below is careful about it.
 *
 * The consequence to be aware of: any renderer showing these bodies must allow
 * raw HTML. `ContentMarkdownRenderer` does, through `rehype-raw` behind a
 * `rehype-sanitize` allowlist. A renderer that does not will show the tags as
 * text.
 *
 * ── Why `summary` is an attribute, not a child node ────────────────────────
 * Same call as `highlightBlock`'s title, for the same reason: a summary is a
 * single line of plain text, and modelling it as a node means a second node
 * type, a content expression that has to force exactly one of them first, and a
 * class of documents where it is missing. An attribute cannot be missing.
 */
export interface DetailsBlockOptions {
  /** Placeholder for the summary input. */
  summaryPlaceholder: string;
}

export const DetailsBlock = Node.create<DetailsBlockOptions>({
  name: "detailsBlock",
  group: "block",
  // Everything the base vocabulary allows, minus another details block —
  // nesting collapses is a UI people get lost in, and the markdown for it is
  // ambiguous about which `</details>` closes which.
  content: "(paragraph|heading|bulletList|orderedList|blockquote|horizontalRule)+",
  isolating: true,
  defining: true,

  addOptions() {
    return { summaryPlaceholder: "Summary" };
  },

  addAttributes() {
    return {
      summary: {
        default: "",
        parseHTML: (element) =>
          element.querySelector("summary")?.textContent?.trim() ?? "",
        // Rendered by the node view, not here — `renderHTML` below is only
        // reached for clipboard HTML and `getHTML()`.
        renderHTML: () => ({}),
      },
      /** Whether it starts expanded. Persisted, so an author can open one by default. */
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => (attributes.open ? { open: "" } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
        // The `<summary>` is an ATTRIBUTE, so it must not also be parsed as
        // content — otherwise every round trip duplicates the summary text into
        // the body. Cloning and stripping it is the documented way to tell
        // ProseMirror which subtree is the content.
        contentElement: (element) => {
          const clone = element.cloneNode(true) as HTMLElement;
          clone.querySelector("summary")?.remove();
          return clone;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes),
      ["summary", {}, (node.attrs.summary as string) || ""],
      ["div", { "data-details-content": "" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DetailsBlockView);
  },

  /**
   * The markdown round trip.
   *
   * `tiptap-markdown` reads this off `storage.markdown`, which is its documented
   * extension point for a node it has never heard of. Without it the serializer
   * falls through to its raw-HTML path and the content comes out escaped.
   */
  addStorage() {
    return {
      markdown: {
        serialize(
          state: {
            write: (s: string) => void;
            renderContent: (n: unknown) => void;
            closeBlock: (n: unknown) => void;
            ensureNewLine: () => void;
          },
          node: { attrs: Record<string, unknown> },
        ) {
          const summary = String(node.attrs.summary ?? "").replace(/\s+/g, " ").trim();
          const open = node.attrs.open ? " open" : "";

          state.write(`<details${open}>\n`);
          state.write(`<summary>${escapeHtml(summary)}</summary>\n`);
          // The blank line that makes the body parse as markdown rather than as
          // raw HTML. See the note at the top of this file.
          state.write("\n");
          state.renderContent(node);
          state.ensureNewLine();
          state.write("</details>");
          state.closeBlock(node);
        },
        parse: {
          // Nothing to do. `html: true` on the Markdown extension already turns
          // `<details>` into HTML, and `parseHTML` above takes it from there.
        },
      },
    };
  },
});

/**
 * The summary is written into an HTML tag, so anything that could close it
 * early has to be escaped. `&` runs first or it would double-escape the others.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
