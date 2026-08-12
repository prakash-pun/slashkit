import type { ReactNode } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import {
  HighlightBlockView,
  type HighlightIconPickerProps,
} from "@/components/slashkit/highlight-block-view";
import { DEFAULT_HIGHLIGHT_TYPE } from "@/lib/slashkit/highlight-style";

/**
 * One "What's New" highlight, as a ProseMirror node.
 *
 * This is what turns a changelog editor from a stack of forms into a single
 * document: the icon, title and type are node ATTRIBUTES rendered by a React
 * node view, while the description underneath is ordinary editable Tiptap
 * content. So one editor holds a whole release, and each block already looks
 * like the row it will become on the public page.
 *
 * ── Why `content` is an explicit list, not `block+` ────────────────────────
 * It does two jobs at once. It stops a highlight nesting inside another
 * highlight — trivially reachable otherwise, since this node is itself in the
 * `block` group, and a nested highlight has no meaning and no markdown form.
 * And it pins the body to exactly the block types the markdown subset supports,
 * so the SCHEMA enforces the contract rather than relying on the slash menu
 * being the only way content gets in.
 *
 * `image` is deliberately NOT in that list, and its absence does not mean
 * images are unsupported — `markdownExtensions` registers them as INLINE nodes,
 * so an image lives inside a paragraph and arrives here as one. Naming `image`
 * directly would be a schema error rather than a permission: an inline node
 * cannot be a direct child of a block-content node. See `markdown-editor.ts`
 * for why inline is the only arrangement that survives a save/load round trip.
 *
 * `isolating` keeps Enter and Backspace at the block's edges from merging two
 * highlights into one.
 */
export interface HighlightBlockOptions {
  /**
   * Your emoji picker, rendered inside the icon popover.
   *
   * A node view is handed `extension`, which makes `configure()` the one clean
   * route for runtime props into a Tiptap NodeView — the API has no other. Left
   * undefined, `HighlightBlockView` falls back to a plain input that accepts
   * one character, which works with every OS emoji keyboard and costs nothing.
   */
  renderIconPicker?: (props: HighlightIconPickerProps) => ReactNode;
}

export const HighlightBlock = Node.create<HighlightBlockOptions>({
  name: "highlightBlock",
  group: "block",
  content: "(paragraph|heading|bulletList)+",
  isolating: true,
  defining: true,

  addOptions() {
    return { renderIconPicker: undefined };
  },

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") ?? "",
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
      type: {
        default: DEFAULT_HIGHLIGHT_TYPE,
        parseHTML: (element) =>
          element.getAttribute("data-type") ?? DEFAULT_HIGHLIGHT_TYPE,
        renderHTML: (attributes) => ({ "data-type": attributes.type }),
      },
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) =>
          attributes.icon ? { "data-icon": attributes.icon } : {},
      },
      // Always "EMOJI" when this editor sets it — the web cannot author an SF
      // Symbol. Kept as its own attribute anyway so a release authored
      // elsewhere round-trips through here without losing what it was.
      iconType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-icon-type"),
        renderHTML: (attributes) =>
          attributes.iconType ? { "data-icon-type": attributes.iconType } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-highlight-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-highlight-block": "" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HighlightBlockView);
  },
});
