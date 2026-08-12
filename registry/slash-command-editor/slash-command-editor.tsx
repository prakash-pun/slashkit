"use client";

import { useEffect } from "react";
import type { AnyExtension, Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";

import { InsertMenu, SelectionMenu } from "@/components/slashkit/editor-menus";
import { PasteLinkChooser } from "@/components/slashkit/paste-link-chooser";
import {
  CANVAS_PROSE,
  markdownExtensions,
} from "@/lib/slashkit/markdown-editor";
import type { SlashCommandItem } from "@/lib/slashkit/commands";
import { cn } from "@/lib/utils";

/**
 * A Notion/Linear-style canvas for one flat markdown document.
 *
 * ── What it owns, and what it refuses to ───────────────────────────────────
 * It owns rich-content EDITING: the `/` menu, the toolbars, the paste chooser,
 * the markdown round trip. It owns nothing else. There is no title field, no
 * slug, no category, no save button and no layout — those are metadata your app
 * models and lays out, and a component that guessed at them would be wrong for
 * every second app that installed it.
 *
 * It never saves, loads or uploads. `onChange` hands you markdown; what happens
 * next is yours.
 *
 * ── The markdown round trip, and why `body` is not a controlled prop ───────
 * `body` is read ONCE, on mount. Parsing markdown into document content needs
 * the schema and the markdown parser, so it cannot be passed as `content` at
 * construction time — the editor has to exist first, which is what the effect
 * below is for.
 *
 * Feeding every keystroke back in as a new `body` would fight the editor for
 * control of its own document and destroy the selection on each round. So to
 * load a DIFFERENT document, remount:
 *
 *     <SlashCommandEditor key={article.id} body={article.body} … />
 *
 * That turns "switch documents" into a remount rather than a synchronisation
 * problem, which is the version that actually works.
 */
export interface SlashCommandEditorProps {
  /** Markdown to open with. Read once — see above. */
  body?: string;
  /** Called with the full document as markdown on every change. */
  onChange?: (markdown: string) => void;
  /**
   * The `/` menu's contents. Required, and deliberately so — see the note at
   * the top of `commands.ts` for why there is no default set.
   */
  commands: SlashCommandItem[];
  /**
   * Task lists — `- [ ] item`.
   *
   * The only part of the vocabulary still opt-in. Everything else (ordered
   * lists, inline code, quotes, dividers, italic, strike, underline,
   * collapsible sections) is always on. Pair it with `taskListCommands` so the
   * menu offers what the schema allows.
   */
  taskLists?: boolean;
  /** Extra Tiptap extensions — a custom node, collaboration, whatever. */
  extraExtensions?: AnyExtension[];
  /** Handed the live editor once it exists, for imperative work. */
  onEditorReady?: (editor: Editor) => void;
  /** Replaces the hint beside the insert button. */
  toolbarHint?: string;
  className?: string;
}

export function SlashCommandEditor({
  body = "",
  onChange,
  commands,
  taskLists = false,
  extraExtensions = [],
  onEditorReady,
  toolbarHint = "Insert a block, or select text to format it",
  className,
}: SlashCommandEditorProps) {
  const editor = useEditor({
    // Tiptap renders client-side only; without this a server-rendering
    // framework logs a hydration mismatch for the editor on every load.
    immediatelyRender: false,
    extensions: [
      ...markdownExtensions(commands, { taskLists }),
      ...extraExtensions,
    ],
    editorProps: {
      attributes: { class: "focus:outline-none min-h-[240px]" },
    },
    onCreate: ({ editor }) => onEditorReady?.(editor),
    onUpdate: ({ editor }) => onChange?.(editor.storage.markdown.getMarkdown()),
  });

  // Initial load only — see the note on `body` above.
  useEffect(() => {
    if (!editor) return;

    editor.commands.setContent(body, { emitUpdate: false });
    // Seeds the parent from the loaded document, since `emitUpdate: false`
    // deliberately skips `onUpdate` — otherwise opening a document and saving
    // it untouched would submit an empty body.
    onChange?.(editor.storage.markdown.getMarkdown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div>
      {/* Above the canvas, where a toolbar is looked for. The `/` shortcut
          still works; this is the version you can find without knowing it. */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/60 pb-2">
        <InsertMenu editor={editor} commands={commands} />
        <span className="text-xs text-muted-foreground">{toolbarHint}</span>
      </div>

      <SelectionMenu editor={editor} />
      <PasteLinkChooser editor={editor} />

      {/* No border or card around it — a document, not a form field. */}
      <div
        className={cn("min-h-[280px] cursor-text", CANVAS_PROSE, className)}
        // Clicking the empty space below the last block should put the caret in
        // the document, the way it does in any document editor.
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) editor?.commands.focus("end");
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
