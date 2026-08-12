"use client";

import { useEffect } from "react";
import type { AnyExtension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";

import { InsertMenu, SelectionMenu } from "@/components/slashkit/editor-menus";
import { PasteLinkChooser } from "@/components/slashkit/paste-link-chooser";
import { HighlightBlock } from "@/lib/slashkit/highlight-block-node";
import { highlightCommand } from "@/lib/slashkit/highlight-command";
import { markdownExtensions } from "@/lib/slashkit/markdown-editor";
import {
  defaultCommands,
  type DefaultCommandsOptions,
  type SlashCommandItem,
} from "@/lib/slashkit/commands";
import {
  docToHighlights,
  highlightsToDoc,
  strayBlockCount,
  type ExtractedHighlight,
  type StoredHighlight,
} from "@/lib/slashkit/extract-highlights";
import type { HighlightIconPickerProps } from "@/components/slashkit/highlight-block-view";
import type { ReactNode } from "react";

/**
 * A whole release as one editable document.
 *
 * Replaces the stack of bordered per-highlight forms a changelog admin usually
 * becomes: a release is a canvas of highlight blocks you create with
 * `/highlight` and edit in place, each already styled like the row it becomes
 * on the public page. There is no separate preview panel because there is
 * nothing left for one to show.
 *
 * ── Tiptap JSON in, highlights out — and why it differs from the others ────
 * Unlike `SlashCommandEditor`, `HelpArticleEditor` and `BlogPostEditor`, which
 * all speak plain markdown strings, this component takes SAVED HIGHLIGHTS and
 * emits `ExtractedHighlight[]`. It has to: a `highlightBlock`'s title, type and
 * icon are structured ATTRIBUTES with no markdown representation, so a flat
 * `getMarkdown()` on this document would silently drop all three.
 *
 * Extracting them needs the live Editor (see `extract-highlights.ts`), so the
 * canvas hands its parent finished highlights rather than a document the parent
 * could not interpret.
 *
 * ── What it still refuses to own ───────────────────────────────────────────
 * The version string, the title, the publish date, draft/published status, the
 * save button and the request that persists any of it. Those are yours. This
 * component's whole job is the body.
 */
export interface ChangelogEditorProps {
  /**
   * The release to open. Read ONCE, on mount — switching releases is a remount:
   *
   *     <ChangelogEditor key={release.id} highlights={release.highlights} … />
   */
  highlights?: StoredHighlight[];
  /**
   * Called on every change with the highlights as they would be saved, in
   * document order with `sortOrder` already assigned.
   *
   * Also fired once on load, so a release opened and saved without being
   * touched submits what it started with rather than nothing.
   */
  onChange: (highlights: ExtractedHighlight[]) => void;
  /**
   * How many top-level blocks are NOT highlights, and would therefore be
   * dropped on save. Surface this — see `strayBlockCount`.
   */
  onStrayContentChange?: (count: number) => void;
  /** The upload and prompt seams. Slashkit never touches a network. */
  commandOptions: DefaultCommandsOptions;
  /** Appended to the `/` menu — `screenshotCommand(...)`, your own, anything. */
  extraCommands?: SlashCommandItem[];
  extraExtensions?: AnyExtension[];
  /** Your emoji picker, rendered in the icon popover. Optional. */
  renderIconPicker?: (props: HighlightIconPickerProps) => ReactNode;
  toolbarHint?: string;
}

export function ChangelogEditor({
  highlights = [],
  onChange,
  onStrayContentChange,
  commandOptions,
  extraCommands = [],
  extraExtensions = [],
  renderIconPicker,
  toolbarHint = "Insert a block, or select text to format it",
}: ChangelogEditorProps) {
  // `/highlight` leads because it is the structural one — everything after it
  // fills in the highlight you are standing in.
  const commands: SlashCommandItem[] = [
    highlightCommand,
    ...defaultCommands(commandOptions),
    ...extraCommands,
  ];

  const editor = useEditor({
    // Tiptap renders client-side only; without this a server-rendering
    // framework logs a hydration mismatch for the editor on every load.
    immediatelyRender: false,
    extensions: [
      ...markdownExtensions(commands),
      HighlightBlock.configure({ renderIconPicker }),
      ...extraExtensions,
    ],
    // No `CANVAS_PROSE` here, unlike the other canvases: every block in this
    // document lives inside a highlight whose node view styles its own body.
    editorProps: { attributes: { class: "focus:outline-none min-h-[240px]" } },
    onUpdate: ({ editor }) => {
      onChange(docToHighlights(editor));
      onStrayContentChange?.(strayBlockCount(editor));
    },
  });

  // Initial load only. Converting saved markdown into document content needs
  // the schema and the markdown parser, so it cannot be passed as `content` at
  // construction time — the editor has to exist first.
  useEffect(() => {
    if (!editor) return;

    // Deferred out of the commit phase on purpose. Setting content builds the
    // highlight blocks' React node views, and `ReactNodeViewRenderer` mounts
    // them with `flushSync` — called straight from this effect, React warns
    // "flushSync was called from inside a lifecycle method" and skips the
    // synchronous render. A microtask puts it after React has finished.
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed) return;

      editor.commands.setContent(highlightsToDoc(editor, highlights), {
        emitUpdate: false,
      });
      // Seeds the parent from the loaded document, since `emitUpdate: false`
      // deliberately skips `onUpdate` — otherwise opening a release and saving
      // it untouched would submit an empty one.
      onChange(docToHighlights(editor));
      onStrayContentChange?.(strayBlockCount(editor));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div>
      {/* Above the canvas, where a toolbar is looked for. The `/` shortcut still
          works; this is the version you can find without knowing it.
          `/highlight` is in this list too, so a release can be started from here
          without knowing the shortcut at all. */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/60 pb-2">
        <InsertMenu editor={editor} commands={commands} />
        <span className="text-xs text-muted-foreground">{toolbarHint}</span>
      </div>

      <SelectionMenu editor={editor} />
      <PasteLinkChooser editor={editor} />

      {/* No border or card around it — a document, not a form field. */}
      <div
        className="min-h-[280px] cursor-text"
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
