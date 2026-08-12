import { Sparkles } from "lucide-react";

import type { SlashCommandItem } from "@/lib/slashkit/commands";
import { TITLE_INPUT_ATTR } from "@/components/slashkit/highlight-block-view";
import { DEFAULT_HIGHLIGHT_TYPE } from "@/lib/slashkit/highlight-style";

/**
 * `/highlight` — starts a new highlight.
 *
 * CHANGELOG ONLY: it depends on the `highlightBlock` node, so offering it in an
 * editor that has not registered `HighlightBlock` throws on
 * `state.schema.nodes.highlightBlock` being undefined.
 *
 * ── Why it cannot just `insertContent` at the cursor ───────────────────────
 * This is the one structural command — every other command inserts content
 * INSIDE the highlight you are standing in, this one starts a new one. The
 * cursor is therefore almost always inside a highlight's body, and the schema
 * forbids a highlight nesting in another, so ProseMirror would resolve a naive
 * insert by splitting the block or dropping it. Walking up to the enclosing
 * highlight and inserting immediately AFTER it is both correct and what "new
 * highlight" should mean when triggered from halfway down an existing one.
 */
export const highlightCommand: SlashCommandItem = {
  title: "Highlight",
  icon: Sparkles,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .command(({ tr, state, dispatch }) => {
        const { $from } = state.selection;

        let insertAt = state.selection.to;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name === "highlightBlock") {
            insertAt = $from.after(depth);
            break;
          }
        }

        const node = state.schema.nodes.highlightBlock?.createAndFill({
          type: DEFAULT_HIGHLIGHT_TYPE,
        });
        if (!node || !dispatch) return false;

        tr.insert(insertAt, node);
        dispatch(tr);

        // The title is the first thing you would type, but it is a DOM input
        // rather than document content, so the selection cannot reach it —
        // focus it directly once the node view has mounted.
        requestAnimationFrame(() => {
          const dom = editor.view.nodeDOM(insertAt);
          if (dom instanceof HTMLElement) {
            dom
              .querySelector<HTMLInputElement>(`input[${TITLE_INPUT_ATTR}]`)
              ?.focus();
          }
        });

        return true;
      })
      .run();
  },
};
