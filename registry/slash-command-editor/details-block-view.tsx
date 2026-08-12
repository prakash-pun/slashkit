"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { ChevronRight, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Marks the summary field so a command can focus a freshly inserted block. */
export const SUMMARY_INPUT_ATTR = "data-details-summary";

/**
 * A collapsible section, while authoring.
 *
 * ── Why it is not a real `<details>` in the editor ─────────────────────────
 * A native `<details>` hides its content from the DOM's point of view when
 * closed, and ProseMirror cannot manage a selection inside a subtree the
 * browser is refusing to lay out — collapsing one with the caret inside it
 * throws off position mapping, and typing near it behaves strangely.
 *
 * So the editor draws its own disclosure: the same chevron, the same summary
 * row, but the content is always in the document and merely hidden with CSS.
 * The published page gets a real `<details>`, where none of that applies
 * because nothing is editing it.
 *
 * `contentEditable={false}` on the chrome is what keeps ProseMirror from trying
 * to manage the summary input and the buttons as document content.
 */
export function DetailsBlockView({
  node,
  updateAttributes,
  deleteNode,
  editor,
  getPos,
  extension,
}: ReactNodeViewProps) {
  const summary = (node.attrs.summary as string) ?? "";
  const open = Boolean(node.attrs.open);
  const placeholder =
    (extension.options?.summaryPlaceholder as string) ?? "Summary";

  /** Enter in the summary should carry on into the body, not do nothing. */
  const focusBody = () => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) return;
    if (!open) updateAttributes({ open: true });
    // +1 steps inside the block, onto its first child.
    editor.chain().focus(pos + 1).run();
  };

  return (
    <NodeViewWrapper
      className={cn(
        "group my-3 overflow-hidden rounded-xl border border-border/60",
        "transition-colors focus-within:border-border",
      )}
    >
      <div
        contentEditable={false}
        className={cn(
          "flex items-center gap-2 bg-muted/40 px-3 py-2",
          open && "border-b border-border/60",
        )}
      >
        <button
          type="button"
          onClick={() => updateAttributes({ open: !open })}
          aria-expanded={open}
          aria-label={open ? "Collapse section" : "Expand section"}
          className={cn(
            "shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <ChevronRight
            className={cn("size-4 transition-transform", open && "rotate-90")}
          />
        </button>

        <input
          {...{ [SUMMARY_INPUT_ATTR]: "" }}
          value={summary}
          onChange={(e) => updateAttributes({ summary: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              focusBody();
            }
          }}
          placeholder={placeholder}
          aria-label="Section summary"
          className={cn(
            "min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-medium text-foreground",
            "outline-none placeholder:text-muted-foreground/50",
          )}
        />

        <button
          type="button"
          onClick={() => deleteNode()}
          aria-label={`Remove section${summary ? `: ${summary}` : ""}`}
          // Always reachable on touch, where hover reveals nothing — the same
          // rule the highlight block follows.
          className={cn(
            "shrink-0 rounded p-1 text-muted-foreground transition",
            "hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Hidden rather than unmounted — see the note at the top. `hidden` would
          be wrong for the same reason: ProseMirror needs the nodes laid out. */}
      <NodeViewContent
        className={cn("px-3 py-2", !open && "sr-only")}
      />
    </NodeViewWrapper>
  );
}
