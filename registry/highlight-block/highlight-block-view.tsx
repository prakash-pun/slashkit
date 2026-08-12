"use client";

import { useState, type ReactNode } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { Trash2 } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HIGHLIGHT_TYPES,
  HIGHLIGHT_TYPE_STYLES,
  DEFAULT_HIGHLIGHT_TYPE,
  displayEmoji,
  styleForType,
} from "@/lib/slashkit/highlight-style";
import { cn } from "@/lib/utils";

/** Marks the title field so the slash command can focus a freshly inserted block. */
export const TITLE_INPUT_ATTR = "data-highlight-title";

/** What an icon picker is handed. See `HighlightBlock.configure`. */
export interface HighlightIconPickerProps {
  value: string | null;
  onSelect: (emoji: string) => void;
  close: () => void;
}

/**
 * The editable chrome around one highlight — and, deliberately, the preview.
 *
 * Styled to match `WhatsNewList` (both read their palette from
 * `highlight-style.ts`), because this design has no separate preview panel:
 * what you type here is already shaped like the row that ships.
 *
 * Title, icon and type are node ATTRIBUTES, not document text. They are edited
 * through a plain controlled input, a popover and a select, all marked
 * `contentEditable={false}` so ProseMirror does not try to manage them as
 * editable content. Only `<NodeViewContent />` is real rich text.
 *
 * ── Bringing your own emoji picker ─────────────────────────────────────────
 * The default picker is a bare input that accepts one character, which works
 * with every OS emoji keyboard and costs no dependency. For something nicer,
 * pass one when you register the node — a node view receives `extension`, which
 * is the only clean route for runtime props into a Tiptap NodeView:
 *
 *     HighlightBlock.configure({
 *       renderIconPicker: ({ onSelect, close }) => (
 *         <EmojiPicker onEmojiSelect={(e) => { onSelect(e.emoji); close(); }} />
 *       ),
 *     })
 */
export function HighlightBlockView({
  node,
  updateAttributes,
  deleteNode,
  editor,
  getPos,
  extension,
}: ReactNodeViewProps) {
  const [iconOpen, setIconOpen] = useState(false);

  const title = (node.attrs.title as string) ?? "";
  const type = (node.attrs.type as string) ?? DEFAULT_HIGHLIGHT_TYPE;
  const icon = node.attrs.icon as string | null;
  const iconType = node.attrs.iconType as string | null;

  const style = styleForType(type);

  const renderIconPicker = extension.options?.renderIconPicker as
    | ((props: HighlightIconPickerProps) => ReactNode)
    | undefined;

  const selectIcon = (emoji: string) => {
    // Both fields move together — an `iconType` without an `icon` is a
    // half-set pair that a validator on the other end will reject.
    updateAttributes({ icon: emoji, iconType: "EMOJI" });
  };

  /** Enter in the title should carry on into the description, not do nothing. */
  const focusBody = () => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) return;
    // +1 steps inside the highlight block, onto its first child.
    editor.chain().focus(pos + 1).run();
  };

  return (
    <NodeViewWrapper
      className={cn(
        "group relative flex gap-4 rounded-lg py-2 pr-2 transition-colors",
        "hover:bg-muted/40",
      )}
    >
      {/* Icon ------------------------------------------------------------- */}
      <Popover open={iconOpen} onOpenChange={setIconOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            contentEditable={false}
            title="Change icon"
            className={cn(
              "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl leading-none",
              "transition-opacity hover:opacity-80",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              style.square,
            )}
          >
            {displayEmoji(icon, iconType, type)}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {renderIconPicker ? (
            renderIconPicker({
              value: icon,
              onSelect: selectIcon,
              close: () => setIconOpen(false),
            })
          ) : (
            <DefaultIconPicker
              value={icon}
              onSelect={selectIcon}
              close={() => setIconOpen(false)}
            />
          )}
        </PopoverContent>
      </Popover>

      <div className="min-w-0 flex-1">
        {/* Title + type ------------------------------------------------- */}
        {/* `flex-wrap` with a floor on the title: on a phone the type select
            and the delete button drop to their own line rather than squeezing
            the title into ~90px, where a name like "Trip budgets" reads as
            "Trip budget". On a wide screen there is room for all three and
            nothing wraps, so the desktop row is unchanged. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <input
            {...{ [TITLE_INPUT_ATTR]: "" }}
            contentEditable={false}
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                focusBody();
              }
            }}
            placeholder="Highlight title"
            className={cn(
              "min-w-[10rem] flex-1 border-none bg-transparent p-0 font-medium text-foreground",
              "outline-none placeholder:text-muted-foreground/50",
            )}
          />

          {/* Secondary metadata, kept out of the way until reached for — the
              default type is right most of the time and the row reads cleaner
              without three pills competing with the titles. `focus:` as well as
              hover, or it would be unreachable by keyboard.

              Hover-to-reveal only from `lg`. A touch screen has no hover, so
              below that this control would be invisible AND unreachable —
              there would be no way to change a highlight's type on a phone at
              all, while it still consumed its width in the row. */}
          <select
            contentEditable={false}
            value={type}
            onChange={(e) => updateAttributes({ type: e.target.value })}
            aria-label="Highlight type"
            className={cn(
              "shrink-0 cursor-pointer appearance-none rounded-full border-none px-2 py-0.5",
              "text-xs font-medium transition-opacity",
              "lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100",
              "focus-visible:outline-none",
              style.pill,
            )}
          >
            {HIGHLIGHT_TYPES.map((t) => (
              <option key={t} value={t}>
                {HIGHLIGHT_TYPE_STYLES[t].label}
              </option>
            ))}
          </select>

          <button
            type="button"
            contentEditable={false}
            onClick={() => deleteNode()}
            aria-label={`Remove highlight${title ? `: ${title}` : ""}`}
            // Same hover-reveal caveat as the type select above: always visible
            // on touch, where "hover to discover" reveals nothing, ever.
            className={cn(
              "shrink-0 rounded p-1 text-muted-foreground transition",
              "hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Body — the only genuinely editable region in here. */}
        <NodeViewContent
          className={cn(
            "mt-0.5 text-sm leading-relaxed text-muted-foreground",
            "[&_p]:my-1 [&_strong]:font-semibold [&_strong]:text-foreground",
            "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground",
            "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground",
            "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5",
            "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
            "[&_img]:my-2 [&_img]:rounded-lg [&_img]:border [&_img]:border-border/60",
          )}
        />
      </div>
    </NodeViewWrapper>
  );
}

/**
 * The zero-dependency fallback picker: type or paste one emoji.
 *
 * Every OS has an emoji keyboard, and this input is where it goes. It is
 * deliberately plain — shipping a 1,800-emoji picker inside a registry item
 * would be a dependency choice made on your behalf. Pass `renderIconPicker` to
 * make this nicer.
 */
function DefaultIconPicker({
  value,
  onSelect,
  close,
}: HighlightIconPickerProps) {
  const [draft, setDraft] = useState(value ?? "");

  const commit = (emoji: string) => {
    const clean = [...emoji.trim()][0];
    if (clean) onSelect(clean);
    close();
  };

  return (
    <div className="flex w-56 flex-col gap-2 p-2">
      <input
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          }
        }}
        placeholder="Paste an emoji…"
        aria-label="Highlight icon"
        className={cn(
          "w-full rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      />
      <div className="flex gap-1">
        {HIGHLIGHT_TYPES.map((type) => {
          const emoji = HIGHLIGHT_TYPE_STYLES[type].emoji;
          return (
            <button
              key={type}
              type="button"
              onClick={() => commit(emoji)}
              aria-label={HIGHLIGHT_TYPE_STYLES[type].label}
              className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
