"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Picks a category: type anything, or choose one already in use.
 *
 * ── Why not a `<select>` ───────────────────────────────────────────────────
 * Store `category` as a plain string, not an enum, so a new category never
 * needs a migration. A `<select>` would undo that decision in the UI — the
 * vocabulary has to be able to grow from here. So: a text input that is
 * AUTHORITATIVE, with the existing categories offered as suggestions below it.
 * Typing a new name is a first-class action, not an "Other…" escape hatch, and
 * picking an existing one is one click.
 *
 * Not a shadcn `Command` palette either: this is one short list of short
 * strings sitting inline in a metadata row, and a modal-feeling combobox is
 * heavier than the choice deserves.
 */
export function CategoryCombobox({
  value,
  onChange,
  suggestions,
  placeholder = "Category",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Categories already in use, in the order they should be offered. */
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();

    // Everything when the field is empty — that is the case where the list is
    // most useful, since it is showing what the content is already organised by.
    if (!query) return suggestions;

    // Everything AGAIN when the value IS one of the suggestions. Filtering here
    // would leave a one-row list containing the value already in the box, so
    // opening something filed under "Gmail Sync" and pressing the chevron to
    // move it elsewhere would show an empty menu — the category could only be
    // changed by first deleting the text by hand. An exact match means the field
    // is displaying a CHOICE, not a half-typed query.
    if (suggestions.some((c) => c.toLowerCase() === query)) return suggestions;

    return suggestions.filter((c) => c.toLowerCase().includes(query));
  }, [suggestions, value]);

  // Only genuinely empty now — a filter that matched nothing, or no categories
  // to offer in the first place.
  const exhausted = matches.length === 0;

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      // Closes when focus leaves the input AND the list. `relatedTarget` is
      // where focus is going; a click on a suggestion keeps it inside this
      // wrapper, so the list must not close before the click registers.
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && open) {
              // Handled, so Escape closes this list rather than bubbling out to
              // whatever dialog the editor might be sitting inside.
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            "w-32 border-none bg-transparent p-0 text-sm text-foreground",
            "outline-none placeholder:text-muted-foreground/60",
          )}
        />
        <button
          type="button"
          // `onMouseDown` with `preventDefault`, not `onClick`: a click would
          // blur the input first, close the list, and then reopen it — the
          // button would appear not to work when the list is already open.
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
          aria-label={open ? "Hide categories" : "Show categories"}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && !exhausted && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 max-h-56 w-48 overflow-y-auto",
            "rounded-lg border border-border/60 bg-popover p-1 shadow-md",
          )}
        >
          {matches.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                onChange(category);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                category === value.trim()
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  category === value.trim() ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="truncate">{category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
