"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import type { SlashCommandItem } from "@/lib/slashkit/commands";
import { cn } from "@/lib/utils";

export interface SlashCommandListHandle {
  /** Returns true when the key was consumed, which stops the editor seeing it. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * The floating menu behind `/`.
 *
 * A plain absolutely-positioned list rather than a popover component: it is
 * driven by ProseMirror's suggestion plugin, which already owns when it opens,
 * what it filters to, and which keys it swallows. Wrapping that in a Radix
 * popover would mean two things fighting over focus, and the EDITOR must keep
 * it the whole time — the caret has to stay visible and typing has to keep
 * filtering. So this list never takes focus, and arrow/enter arrive here from
 * the editor's own keydown handler through the imperative handle below.
 *
 * Reused verbatim by `InsertMenu`, which is the same list opened from a button
 * instead of a keystroke.
 */
export const SlashCommandList = forwardRef<
  SlashCommandListHandle,
  {
    items: SlashCommandItem[];
    onSelect: (item: SlashCommandItem) => void;
  }
>(function SlashCommandList({ items, onSelect }, ref) {
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtering as you type reorders the list under the highlight, so an index
  // held from the previous query points at an unrelated command.
  //
  // Reset during RENDER, not in an effect: an effect runs after a render that
  // has already highlighted the stale index, and Enter in that window picks the
  // wrong command.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelected(0);
  }

  // Keeps the highlighted row in view when arrowing past the scroll edge.
  useEffect(() => {
    containerRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;

      if (event.key === "ArrowUp") {
        setSelected((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      // Tab as well as Enter: the menu reads as a completion, and Tab is the
      // habit that carries over from every other one.
      if (event.key === "Enter" || event.key === "Tab") {
        onSelect(items[selected]);
        return true;
      }
      return false;
    },
  }));

  // The plugin keeps the menu mounted while the query still starts with "/", so
  // a query matching nothing has to say so — an empty box reads as broken.
  if (items.length === 0) {
    return (
      <div className="w-60 rounded-lg border border-border/60 bg-popover p-2 text-xs text-muted-foreground">
        No matching block
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-72 w-60 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1"
    >
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          data-index={index}
          // Mouse DOWN, not click: click fires after blur, and blurring the
          // editor collapses the selection the command is about to act on.
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          onMouseEnter={() => setSelected(index)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            index === selected
              ? "bg-primary text-primary-foreground"
              : "text-foreground",
          )}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.title}</span>
        </button>
      ))}
    </div>
  );
});
