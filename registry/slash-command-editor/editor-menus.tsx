"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Plus,
  Strikethrough,
  Underline,
  Unlink,
} from "lucide-react";

import { SlashCommandList } from "@/components/slashkit/slash-command-list";
import { promptForLink, type SlashCommandItem } from "@/lib/slashkit/commands";
import { cn } from "@/lib/utils";

/**
 * The two menus that sit around a canvas: an insert button and a selection
 * toolbar.
 *
 * Both exist because `/` alone is not discoverable. The slash menu only opens
 * when the character starts a line or follows a space — that rule is what stops
 * a URL, a date or "1/2" from popping it open mid-sentence, and it is not going
 * away — but it means someone who types `/` after a word sees nothing happen
 * and concludes the feature is broken. A visible button has no position rule to
 * learn. And a bubble menu covers the other half of the problem: `/` INSERTS,
 * and without it there is no way at all to format text already typed.
 */

// ─────────────────────────────────────────────────────────────────────────────
// INSERT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A "+" that opens the same command list as `/`, at the caret.
 *
 * Runs each command with a COLLAPSED range at the current selection. Every
 * command begins with `deleteRange(range)` — which is how the slash menu erases
 * the "/query" text it was triggered by — and a range whose `from` equals its
 * `to` deletes nothing, so the same command objects work unchanged from both
 * entry points. That is the whole reason this reuses `SlashCommandItem` rather
 * than growing a second list of actions to keep in step.
 */
export function InsertMenu({
  editor,
  commands,
  className,
}: {
  editor: Editor | null;
  commands: SlashCommandItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Escape closes, and a click anywhere else does too. Pointerdown rather than
  // click so it beats the button's own handler re-opening the menu.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!editor) return null;

  const run = (item: SlashCommandItem) => {
    setOpen(false);
    // Read the selection at RUN time, not when the menu opened: the editor kept
    // its selection through the button press (see `onMouseDown` below), and
    // ProseMirror's state is the only thing that knows where the caret is.
    const { from, to } = editor.state.selection;
    item.command({ editor, range: { from, to } });
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        // Mouse DOWN with preventDefault, not click: clicking blurs the editor
        // first, and a blurred editor collapses the selection these commands
        // are about to act on.
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Insert a block"
        title="Insert a block"
        className={cn(
          "flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground",
          "transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-muted text-foreground",
        )}
      >
        <Plus className="size-4" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1">
          {/* The same list the slash menu renders. It takes no focus, so the
              caret stays where it was and the editor stays live behind it —
              which is also why arrow keys are not wired up here: there is no
              suggestion plugin feeding it keystrokes from this entry point. */}
          <SlashCommandList items={commands} onSelect={run} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION TOOLBAR
// ─────────────────────────────────────────────────────────────────────────────

interface BubbleAction {
  title: string;
  icon: typeof Bold;
  /** Whether the mark/node is already applied to the selection. */
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
  /** Starts a new group, drawn with a separator before it. */
  startsGroup?: boolean;
}

/**
 * Exactly the formatting the schema actually has, and nothing else.
 *
 * Every entry here corresponds to a mark or node `markdownExtensions` enables.
 * A button for anything else would be a no-op that looks like a bug, so when
 * you widen the schema, widen this — in that order, never the reverse.
 *
 * Grouped: inline marks, then block types. Underline is last of the marks
 * because it is the one that is HTML rather than markdown — see
 * `underline-mark.ts` for the trade-off, and delete the entry with the
 * extension if you would rather not take it.
 */
const BUBBLE_ACTIONS: BubbleAction[] = [
  {
    title: "Bold",
    icon: Bold,
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    title: "Italic",
    icon: Italic,
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    title: "Strikethrough",
    icon: Strikethrough,
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    title: "Underline",
    icon: Underline,
    isActive: (editor) => editor.isActive("underline"),
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    title: "Inline code",
    icon: Code,
    isActive: (editor) => editor.isActive("code"),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    title: "Heading",
    icon: Heading2,
    startsGroup: true,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    // Toggles back to a paragraph when it is already a heading, so the same
    // button undoes itself instead of being a one-way trip.
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Subheading",
    icon: Heading3,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    icon: List,
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

export function SelectionMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const linked = editor.isActive("link");

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed, from, to }) => {
        // Nothing selected — this is a menu ABOUT a selection, and showing it
        // for a bare caret would cover the text being typed.
        if (from === to) return false;
        // A selected image is a NodeSelection: bold and headings do not apply
        // to it, and an all-inert toolbar is worse than none.
        if (ed.state.selection instanceof NodeSelection) return false;
        // A selection can span an empty run of nodes and still report from<to.
        return Boolean(ed.state.doc.textBetween(from, to).trim());
      }}
      className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-popover p-1 shadow-md"
    >
      {BUBBLE_ACTIONS.map((action) => {
        const active = action.isActive(editor);
        return (
          <Fragment key={action.title}>
            {action.startsGroup && (
              <span aria-hidden className="mx-0.5 h-5 w-px bg-border/60" />
            )}
          <button
            type="button"
            // Same reasoning as everywhere else in this file: click blurs the
            // editor and collapses the very selection being formatted.
            onMouseDown={(e) => {
              e.preventDefault();
              action.run(editor);
            }}
            aria-pressed={active}
            aria-label={action.title}
            title={action.title}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <action.icon className="size-4" />
          </button>
          </Fragment>
        );
      })}

      {/* Link is last and separated: it is the one action that opens a prompt
          rather than applying instantly. */}
      <span aria-hidden className="mx-0.5 h-5 w-px bg-border/60" />

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          if (linked) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          // The same validator the slash command uses — one `safeUrl` behind
          // both prompts, rather than a second one here that forgets to block
          // `javascript:`.
          const url = promptForLink();
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        aria-pressed={linked}
        aria-label={linked ? "Remove link" : "Add link"}
        title={linked ? "Remove link" : "Add link"}
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          linked
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {linked ? <Unlink className="size-4" /> : <LinkIcon className="size-4" />}
      </button>
    </BubbleMenu>
  );
}
