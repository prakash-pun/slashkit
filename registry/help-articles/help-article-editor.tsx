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
import {
  defaultCommands,
  screenshotCommand,
  type DefaultCommandsOptions,
  type SlashCommandItem,
} from "@/lib/slashkit/commands";
import { requestScreenshots } from "@/lib/slashkit/screenshot-request";
import {
  DEFAULT_PLATFORM_TAGS,
  parsePlatformAlt,
} from "@/lib/slashkit/parse-platform-alt";
import { cn } from "@/lib/utils";

/**
 * One help article as one editable document.
 *
 * Simpler than `ChangelogEditor` in exactly one way, and it is the way that
 * matters: an article is a plain Tiptap document, so the whole thing round
 * trips through `tiptap-markdown` directly. `getMarkdown()` on the document IS
 * the body, and `setContent(markdown)` loads it back — there is no per-fragment
 * walk, because there is no custom node.
 *
 * What it adds over the bare `SlashCommandEditor` is the two things a help
 * centre actually needs: the `/screenshot` command, and a preview filter for
 * the platform-tagged images that command writes.
 *
 * Metadata — title, slug, category, icon, sort order — is yours. This owns the
 * body and nothing else.
 */
export interface HelpArticleEditorProps {
  /** Markdown to open with. Read once; remount with `key` to switch articles. */
  body?: string;
  onChange: (markdown: string) => void;
  /** The upload and prompt seams. Slashkit never touches a network. */
  commandOptions: DefaultCommandsOptions;
  /**
   * Which platform's images the CANVAS shows, or `"both"`.
   *
   * The editor's own view is the one place every platform's images are visible
   * at once — no reader ever sees that. Left alone it quietly misrepresents
   * what a reader gets, so offer the same switch the public page has, plus the
   * "both" an author needs in order to check that a pair is actually there.
   */
  preview?: string;
  platformTags?: readonly string[];
  /**
   * Where `/screenshot` gets its images. Defaults to the `screenshot-dialog`
   * item's bridge — mount `<ScreenshotDialogHost />` beside this and it works.
   * Pass `null` to leave the command out entirely.
   */
  onRequestScreenshots?: typeof requestScreenshots | null;
  extraCommands?: SlashCommandItem[];
  extraExtensions?: AnyExtension[];
  onEditorReady?: (editor: Editor) => void;
  toolbarHint?: string;
  className?: string;
}

export function HelpArticleEditor({
  body = "",
  onChange,
  commandOptions,
  preview = "both",
  platformTags = DEFAULT_PLATFORM_TAGS,
  onRequestScreenshots = requestScreenshots,
  extraCommands = [],
  extraExtensions = [],
  onEditorReady,
  toolbarHint = "Insert a block, or select text to format it",
  className,
}: HelpArticleEditorProps) {
  // `/screenshot` sits next to `/image` because they are the same decision one
  // step apart: one picture, or the same picture on several platforms.
  const commands: SlashCommandItem[] = [
    ...defaultCommands(commandOptions),
    ...(onRequestScreenshots
      ? [screenshotCommand(onRequestScreenshots, platformTags)]
      : []),
    ...extraCommands,
  ];

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...markdownExtensions(commands), ...extraExtensions],
    editorProps: { attributes: { class: "focus:outline-none min-h-[240px]" } },
    onCreate: ({ editor }) => onEditorReady?.(editor),
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
  });

  // Initial load only — see `SlashCommandEditor` for the full reasoning.
  useEffect(() => {
    if (!editor) return;

    editor.commands.setContent(body, { emitUpdate: false });
    // Seeds the parent, since `emitUpdate: false` skips `onUpdate` — otherwise
    // opening an article and saving it untouched would submit an empty body.
    onChange(editor.storage.markdown.getMarkdown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Platform filtering for the preview, applied as a STYLE rather than by
  // touching the document. Hiding an image by removing it from the editor would
  // mean it is gone from the markdown too — the preview must never be able to
  // change what gets saved.
  //
  // No dependency array: this has to re-run after any render that could have
  // added an image, and ProseMirror's DOM is not React's to track.
  useEffect(() => {
    if (!editor) return;

    // `:not(.ProseMirror-separator)` — those are ProseMirror's own zero-content
    // images, not document content, and their display is its business.
    const images = editor.view.dom.querySelectorAll<HTMLImageElement>(
      "img:not(.ProseMirror-separator)",
    );

    for (const img of images) {
      const { tag } = parsePlatformAlt(img.getAttribute("alt"), platformTags);
      const hidden = preview !== "both" && tag !== null && tag !== preview;
      img.style.display = hidden ? "none" : "";
    }
  });

  return (
    <div>
      {/* Above the canvas, where a toolbar is looked for. The `/` shortcut still
          works; this is the version you can find without knowing it. */}
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
