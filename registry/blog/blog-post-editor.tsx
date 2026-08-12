"use client";

import type { AnyExtension, Editor } from "@tiptap/core";

import { SlashCommandEditor } from "@/components/slashkit/slash-command-editor";
import {
  defaultCommands,
  taskListCommands,
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
 * ── Why this one gets task lists and the others do not ─────────────────────
 * `- [ ] item` is a GFM extension, not CommonMark: anywhere without GFM it
 * renders as the literal text "[ ]". A blog post is typically the one surface
 * with a single consumer — a browser and a crawler, both reading THIS renderer
 * — so it is the one that can afford a construct with that caveat.
 *
 * If your posts are also parsed elsewhere, pass `taskLists={false}` and the
 * command disappears with the node type; they switch together by construction.
 *
 * Everything else in the vocabulary — ordered lists, inline code, quotes,
 * dividers, italic, strike, underline, collapsible sections — is on for every
 * surface, so a post is no longer meaningfully richer than an article.
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
  /** Task lists. On by default here — see above. */
  taskLists?: boolean;
  extraCommands?: SlashCommandItem[];
  extraExtensions?: AnyExtension[];
  onEditorReady?: (editor: Editor) => void;
  className?: string;
}

export function BlogPostEditor({
  body = "",
  onChange,
  commandOptions,
  taskLists = true,
  extraCommands = [],
  extraExtensions = [],
  onEditorReady,
  className,
}: BlogPostEditorProps) {
  const commands: SlashCommandItem[] = [
    ...defaultCommands(commandOptions),
    ...(taskLists ? taskListCommands : []),
    ...extraCommands,
  ];

  return (
    <SlashCommandEditor
      body={body}
      onChange={onChange}
      commands={commands}
      taskLists={taskLists}
      extraExtensions={extraExtensions}
      onEditorReady={onEditorReady}
      // Taller than the other two: a post is long-form by nature, and a canvas
      // that starts at the height of a changelog highlight reads as a text
      // field rather than a page.
      className={className ?? "min-h-[360px]"}
    />
  );
}
