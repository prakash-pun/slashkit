"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The two-pane layout behind a list-plus-canvas editor, and the master/detail
 * behaviour that makes it usable on a phone.
 *
 * ── The problem this solves ────────────────────────────────────────────────
 * Stacking the panes (canvas, then list) is the obvious responsive move and it
 * reads fine in a screenshot, but it is bad to actually use: the canvas is a
 * document editor with a ~280px minimum plus its own empty space, so on a phone
 * the list of things you came to open sits a full screen BELOW the editor.
 * Every "let me edit a different one" costs a long scroll past a blank canvas,
 * and there is no indication the list is down there at all.
 *
 * So below `lg` this is a master/detail: the list OR the editor, one at a time,
 * with a back link. Picking something moves you to the editor; back returns you
 * to the list. From `lg` both panes are always visible and `view` is ignored
 * entirely — the desktop layout does not pay for the phone one.
 *
 * Hiding is done with CSS (`hidden lg:block`) rather than by not rendering, so
 * resizing across the breakpoint never destroys editor state — a live Tiptap
 * instance unmounting because someone rotated their phone would lose the
 * document.
 */
export type EditorView = "list" | "editor";

/**
 * The list pane's frame.
 *
 * ── Why it sticks ──────────────────────────────────────────────────────────
 * The pane is a NAVIGATION list, and a document runs several screens long. Left
 * static, the moment you scroll into the middle of one the way to reach any
 * other is gone — you scroll all the way back up, click, and lose your place.
 * Sticking it keeps "open a different one" a click away from anywhere.
 *
 * `lg:` only, and that is not just caution: below `lg` this shell is a
 * master/detail, so the list and the editor are never on screen together and
 * there is nothing for the list to stick beside.
 *
 * The three parts travel together or the pane misbehaves —
 *   `lg:sticky` + `lg:top-…`  pin it under your app's sticky nav;
 *   `lg:max-h-…`              stop it at the bottom of the viewport, since a
 *                             pane taller than the screen cannot be scrolled to
 *                             the end of once it is pinned;
 *   `lg:overflow-y-auto`      give it its own scrollbar for that overflow.
 *
 * `--slashkit-nav-height` is yours to publish (`:root { --slashkit-nav-height:
 * 56px }`); it falls back to 0 if you don't, which is right for a page with no
 * sticky nav.
 *
 * `overscroll-contain` keeps a flick at the end of the list from scrolling the
 * DOCUMENT behind it, which is disorienting when two panes scroll separately.
 *
 * NOTE: this depends on `lg:items-start` on the flex row in `EditorShell`. A
 * stretched flex item is already as tall as its container, so it has no room to
 * move within it and `position: sticky` silently does nothing.
 */
export const EDITOR_SIDEBAR = [
  "w-full shrink-0 p-3 lg:w-72 lg:border-l lg:border-border/60",
  "lg:sticky lg:top-[var(--slashkit-nav-height,0px)]",
  "lg:max-h-[calc(100svh-var(--slashkit-nav-height,0px))]",
  "lg:overflow-y-auto lg:overscroll-contain",
].join(" ");

export function EditorShell({
  view,
  onBack,
  backLabel,
  children,
  list,
  className,
}: {
  view: EditorView;
  onBack: () => void;
  /** What the phone back link says — "All articles", "All releases". */
  backLabel: string;
  /** The editor pane. */
  children: ReactNode;
  /** The list pane. */
  list: ReactNode;
  className?: string;
}) {
  return (
    // Editor first in source order, so `flex-row` puts it on the LEFT and the
    // list on the right from `lg`. The one easy thing to get backwards here.
    <div className={cn("flex flex-col lg:flex-row lg:items-start", className)}>
      <div
        className={cn(
          "min-w-0 flex-1 lg:pr-8",
          view === "list" && "hidden lg:block",
        )}
      >
        {/* Phone-only: the way back to the list, and the only thing that says a
            list exists at all once you are in the editor. */}
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "mb-4 -ml-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-sm text-muted-foreground",
            "transition-colors hover:text-foreground lg:hidden",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </button>

        {children}
      </div>

      {list}
    </div>
  );
}

/**
 * The save/publish row — sticky to the bottom of the viewport at every width.
 *
 * A Save button that lives underneath the whole document means scrolling to the
 * end of your own article every time you want to keep it, and the button you
 * press most often should not be the hardest one to reach. That is as true on a
 * wide screen as on a phone: a document runs several screens whatever the
 * window is, with the extra insult on desktop that the sidebar beside it stays
 * put while the one control you actually need scrolls away. One behaviour at
 * every width.
 *
 * Sticky rather than fixed, deliberately: sticky keeps the element in the flow,
 * so the space it occupies at the end of the document is reserved and the last
 * paragraph can always be scrolled clear of the bar. A fixed bar would sit on
 * top of it permanently and need a matching bottom padding somewhere else to
 * compensate — a coupling that breaks the moment either number changes.
 *
 * The blur and top border are what keep the buttons legible over whatever text
 * is passing underneath.
 *
 * The negative margins are a full-bleed trick and they must track YOUR page
 * gutters — the defaults cancel `px-4` / `sm:px-6` plus `EditorShell`'s own
 * `lg:pr-8`. Different gutters, different numbers; pass `className` to override.
 */
export function EditorActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-border/60",
        "bg-background/85 px-4 py-3 backdrop-blur-md",
        "sm:-mx-6 sm:px-6",
        // Right edge only, from `lg`: the bar then runs the full width of the
        // editor column and stops exactly at the sidebar's border rather than
        // 8px shy of it.
        "lg:-mr-8 lg:pr-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
