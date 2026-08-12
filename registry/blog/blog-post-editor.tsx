"use client";

import type { AnyExtension, Editor } from "@tiptap/core";

import { SlashCommandEditor } from "@/components/slashkit/slash-command-editor";
import {
  defaultCommands,
  richBlockCommands,
  type DefaultCommandsOptions,
  type SlashCommandItem,
} from "@/lib/slashkit/commands";

/**
 * One blog post as one editable document.
 *
 * The plainest of the three block editors: a post is an ordinary Tiptap
 * document, so `getMarkdown()` on the whole thing IS the body and
 * `setContent(markdown)` loads it back — no per-fragment walk like the
 * changelog's highlights, and no platform-image filter like the help articles'.
 *
 * ── Why this one gets `richBlocks` and the others do not ───────────────────
 * Blockquotes, dividers and checklists sit outside the markdown floor
 * `markdownExtensions` defends, and that floor exists because a body is usually
 * parsed by more than one thing — a mobile client, a feed reader, another
 * renderer. A blog post is typically the one surface with a single consumer: a
 * browser and a crawler, both reading THIS renderer. So it is the one that can
 * afford a wider vocabulary.
 *
 * If your posts are also parsed elsewhere, pass `richBlocks={false}` and the
 * three extra commands disappear with the three extra node types — they switch
 * together by construction.
 *
 * Draft/publish state, author, cover image, category and slug are metadata your
 * app manages around this editor. Slashkit dictates no form for them —
 * `CoverImageUploader` and `CategoryCombobox` are separate items you compose
 * yourself, because every app's metadata differs.
 */
export interface BlogPostEditorProps {
  /** Markdown to open with. Read once; remount with `key` to switch posts. */
  body?: string;
  onChange: (markdown: string) => void;
  /** The upload and prompt seams. Slashkit never touches a network. */
  commandOptions: DefaultCommandsOptions;
  /**
   * Blockquotes, dividers and checklists. On by default here — see above.
   *
   * Must match the `richBlocks` you pass `ContentMarkdownRenderer`, or an
   * author writes blocks that render as nothing.
   */
  richBlocks?: boolean;
  extraCommands?: SlashCommandItem[];
  extraExtensions?: AnyExtension[];
  onEditorReady?: (editor: Editor) => void;
  className?: string;
}

export function BlogPostEditor({
  body = "",
  onChange,
  commandOptions,
  richBlocks = true,
  extraCommands = [],
  extraExtensions = [],
  onEditorReady,
  className,
}: BlogPostEditorProps) {
  const commands: SlashCommandItem[] = [
    ...defaultCommands(commandOptions),
    ...(richBlocks ? richBlockCommands : []),
    ...extraCommands,
  ];

  return (
    <SlashCommandEditor
      body={body}
      onChange={onChange}
      commands={commands}
      richBlocks={richBlocks}
      extraExtensions={extraExtensions}
      onEditorReady={onEditorReady}
      // Taller than the other two: a post is long-form by nature, and a canvas
      // that starts at the height of a changelog highlight reads as a text
      // field rather than a page.
      className={className ?? "min-h-[360px]"}
    />
  );
}
