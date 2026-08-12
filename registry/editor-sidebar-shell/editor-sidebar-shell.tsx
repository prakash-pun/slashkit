"use client";

import type { ComponentType, ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { EDITOR_SIDEBAR } from "@/components/slashkit/editor-shell";
import { cn } from "@/lib/utils";

/**
 * A browsable entry list beside a canvas — Notion/Linear treatment: no row
 * borders, a tint on the active row, roomy padding.
 *
 * One component for every list an editor might need beside it. `groupBy` is
 * what makes a drafts/published split, a category listing and a flat release
 * list all expressible here — three near-identical sidebars is how one of them
 * quietly acquires a different hover colour.
 */
export interface SidebarEntry {
  id: string;
  label: string;
  /** A second line — a slug, an author, a relative date. */
  sublabel?: ReactNode;
  /** A leading glyph. An emoji string, or omit. */
  icon?: string | null;
  /**
   * A trailing marker for something the label cannot say — "has a cover image",
   * "has platform screenshots". Given `aria-label` from `badgeLabel`.
   */
  badge?: ComponentType<{ className?: string; "aria-label"?: string }>;
  badgeLabel?: string;
}

export interface EditorSidebarShellProps {
  entries: SidebarEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  /**
   * Omit to hide the delete control entirely.
   *
   * Wire this to a confirm dialog. The button is one tap from the row you were
   * about to open, and there is no undo for a deleted document.
   */
  onDelete?: (id: string) => void;
  newLabel?: string;
  /** True when the canvas holds an unsaved new entry — tints the New button. */
  draft?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  /**
   * Buckets entries under headings. Returning the same string for everything
   * (or omitting this) gives one flat list with no heading.
   *
   * Groups come out in FIRST-SEEN order, via a Map — object key order would
   * reorder anything that looks like an integer, and a category named "2026"
   * jumping to the top of the panel for no visible reason is a real bug.
   */
  groupBy?: (entry: SidebarEntry) => string;
  /** The line under the list — "12 articles · 3 categories". */
  footer?: ReactNode;
  /** How a parent hides this on a phone. See `EditorShell`. */
  className?: string;
}

export function EditorSidebarShell({
  entries,
  activeId,
  onSelect,
  onNew,
  onDelete,
  newLabel = "New",
  draft = false,
  loading = false,
  emptyLabel = "Nothing here yet.",
  groupBy,
  footer,
  className,
}: EditorSidebarShellProps) {
  const groups = groupEntries(entries, groupBy);

  return (
    <div className={cn(EDITOR_SIDEBAR, className)}>
      <button
        type="button"
        onClick={onNew}
        className={cn(
          "mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          draft
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Plus className="size-4" />
        {newLabel}
      </button>

      {loading && entries.length === 0 && (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
      )}

      {!loading && entries.length === 0 && (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
      )}

      <div className="space-y-3">
        {groups.map(([heading, groupEntries]) => (
          <div key={heading}>
            {heading && (
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                {heading} · {groupEntries.length}
              </p>
            )}
            <div className="space-y-0.5">
              {groupEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  active={entry.id === activeId}
                  onSelect={() => onSelect(entry.id)}
                  onDelete={onDelete && (() => onDelete(entry.id))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {footer && entries.length > 0 && (
        <p className="mt-3 border-t border-border/60 px-2 pt-2 text-[11px] text-muted-foreground/70">
          {footer}
        </p>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  active,
  onSelect,
  onDelete,
}: {
  entry: SidebarEntry;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const Badge = entry.badge;

  return (
    // NOT a <button> inside a <button> — the delete control is a SIBLING,
    // because nesting them is invalid HTML and makes the inner one unreachable.
    <div
      className={cn(
        "group relative flex items-start gap-1 rounded-md pr-1 transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="flex w-full items-center gap-1.5">
          {entry.icon?.trim() && (
            <span aria-hidden className="shrink-0 text-xs leading-none">
              {entry.icon.trim()}
            </span>
          )}
          <span
            className={cn(
              "truncate text-sm",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {entry.label.trim() || "Untitled"}
          </span>
          {Badge && (
            <Badge
              aria-label={entry.badgeLabel}
              className="ml-auto size-3 shrink-0 text-muted-foreground/70"
            />
          )}
        </span>

        {entry.sublabel && (
          <span className="w-full truncate text-[11px] text-muted-foreground/70">
            {entry.sublabel}
          </span>
        )}
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${entry.label.trim() || "entry"}`}
          // Hover-to-reveal only from `lg`. A touch screen never hovers, so
          // below that this would be invisible AND unreachable — no way to
          // delete anything from a phone at all.
          className={cn(
            "mt-1.5 shrink-0 rounded p-1 text-muted-foreground transition",
            "hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** See `groupBy` above for why this is a Map and not an object. */
function groupEntries(
  entries: SidebarEntry[],
  groupBy?: (entry: SidebarEntry) => string,
): [string, SidebarEntry[]][] {
  if (!groupBy) return entries.length ? [["", entries]] : [];

  const groups = new Map<string, SidebarEntry[]>();
  for (const entry of entries) {
    const key = groupBy(entry);
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups];
}
