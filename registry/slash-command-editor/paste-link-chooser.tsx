"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { ImageIcon, Link2, Play } from "lucide-react";

import { pasteLinkKey, type PastedLink } from "@/lib/slashkit/paste-link";
import { cn } from "@/lib/utils";

/**
 * The "keep it a link, or embed it?" chooser, shown just after a URL is pasted.
 *
 * ── Why offer rather than decide ───────────────────────────────────────────
 * An editor that silently turns every pasted URL into a card is wrong about
 * half the time — plenty of links are references in a sentence, not things to
 * look at. An editor that never does it makes embedding a chore. So the paste
 * lands as exactly what was pasted, and this appears beside it for as long as
 * it takes to click once or keep typing. Ignoring it costs nothing.
 *
 * ── Why each option writes EXISTING markdown ───────────────────────────────
 * Nothing here invents a new construct. "Video" writes `[video](…)`, the
 * convention every renderer in this kit already draws as a player card.
 * "Image" writes `![](…)`. "Link" leaves the plain link alone. That is what
 * lets the feature exist without a schema change or a new node type — the
 * editor is choosing between shapes the whole system already understands.
 */
export function PasteLinkChooser({ editor }: { editor: Editor | null }) {
  const [pasted, setPasted] = useState<PastedLink | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read the plugin's state on every transaction. `editor.on("transaction")`
  // rather than a React-Tiptap hook because this is PLUGIN state, not editor
  // state, and nothing else re-renders when it changes.
  useEffect(() => {
    if (!editor) return;

    const sync = () => setPasted(pasteLinkKey.getState(editor.state) ?? null);
    sync();

    editor.on("transaction", sync);
    return () => {
      editor.off("transaction", sync);
    };
  }, [editor]);

  // Pinned to the pasted text, flipping above when the page runs out below.
  useEffect(() => {
    const element = containerRef.current;
    if (!editor || !pasted || !element) return;

    let cancelled = false;
    const place = () => {
      if (cancelled || editor.isDestroyed) return;
      const start = editor.view.coordsAtPos(pasted.from);
      const end = editor.view.coordsAtPos(
        Math.min(pasted.to, editor.state.doc.content.size),
      );

      void computePosition(
        {
          getBoundingClientRect: () => ({
            x: start.left,
            y: start.top,
            width: Math.max(end.right - start.left, 1),
            height: end.bottom - start.top,
            top: start.top,
            left: start.left,
            right: end.right,
            bottom: end.bottom,
          }),
        },
        element,
        {
          // MUST match the element's `position: fixed` below. Under the default
          // "absolute" strategy floating-ui returns coordinates relative to the
          // offset parent — the document element — so it adds the page's scroll
          // offset to y. On a fixed element that offset is pure error: the
          // chooser lands one viewport-scroll below the caret, which on a page
          // that is already scrolled means it renders off screen and the whole
          // feature looks like it does not exist.
          strategy: "fixed",
          placement: "bottom-start",
          middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
        },
      ).then(({ x, y }) => {
        if (cancelled) return;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      });
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [editor, pasted]);

  if (!editor || !pasted) return null;

  /** Clears the note without touching the document — "keep it as a link". */
  const dismiss = () => {
    editor.view.dispatch(editor.state.tr.setMeta(pasteLinkKey, null));
  };

  /** Replaces the pasted text with `content`, then clears the note. */
  const replaceWith = (
    content: Parameters<Editor["commands"]["insertContentAt"]>[1],
  ) => {
    const to = Math.min(pasted.to, editor.state.doc.content.size);
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pasted.from, to }, content)
      .command(({ tr, dispatch }) => {
        // Same transaction as the replacement, so the chooser cannot flash back
        // for a frame against text that no longer exists.
        if (dispatch) tr.setMeta(pasteLinkKey, null);
        return true;
      })
      .run();
  };

  const asImage = () =>
    replaceWith({ type: "image", attrs: { src: pasted.url, alt: "" } });

  const asVideo = () =>
    replaceWith({
      type: "text",
      text: "video",
      marks: [{ type: "link", attrs: { href: pasted.url } }],
    });

  return (
    <div
      ref={containerRef}
      // Rendered in place but positioned fixed: an editor usually sits inside a
      // scrollable, bordered column, and an absolutely-positioned chooser gets
      // clipped the moment it needs to overflow one.
      style={{ position: "fixed", top: 0, left: 0 }}
      className={cn(
        "z-50 flex items-center gap-1 rounded-lg border border-border/60 bg-popover p-1",
        "shadow-md",
      )}
    >
      <span className="px-1.5 text-xs text-muted-foreground">Paste as</span>

      <Option icon={Link2} label="Link" onSelect={dismiss} active />

      {/* Only offered when the URL could plausibly be one. An "Image" button on
          a link to an article would produce a broken picture, and a "Video" one
          on a blog post would produce a player card that plays nothing. */}
      {pasted.isImage && (
        <Option icon={ImageIcon} label="Image" onSelect={asImage} />
      )}
      {pasted.isVideo && <Option icon={Play} label="Video" onSelect={asVideo} />}
    </div>
  );
}

function Option({
  icon: Icon,
  label,
  onSelect,
  active = false,
}: {
  icon: typeof Link2;
  label: string;
  onSelect: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      // Mouse down with preventDefault, as everywhere else here: a click blurs
      // the editor first, and these commands act on its selection.
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "text-foreground hover:bg-muted"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
