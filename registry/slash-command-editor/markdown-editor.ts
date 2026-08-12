import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "tiptap-markdown";

import { LinkWithPreview } from "@/lib/slashkit/link-with-preview";
import { PasteLink } from "@/lib/slashkit/paste-link";
import { SlashCommand } from "@/lib/slashkit/slash-command";
import type { SlashCommandItem } from "@/lib/slashkit/commands";

/**
 * The one editor configuration behind every Slashkit canvas.
 *
 * If you run more than one editor — a changelog, a help centre, a blog — they
 * must agree about what markdown is legal, because they write into the same
 * kind of column and are read by the same renderer. Three hand-maintained
 * copies of this list is how one of them quietly acquires a table.
 *
 * ── Why the extension list is SUBTRACTIVE ──────────────────────────────────
 * StarterKit ships blockquote, code, code blocks, horizontal rules, ordered
 * lists, strike, italic and underline. Each carries an INPUT RULE — typing
 * "> ", "1. " or "```" produces the block whether or not a slash command offers
 * it — so restricting the `/` menu is not enough on its own. Turning one back
 * on without a renderer that draws it produces markdown that looks right in the
 * editor and renders as nothing where it ships.
 *
 * The subset left enabled is: headings (2–3), paragraphs, bullet lists, bold,
 * links, images. That is a deliberate floor, not an accident — it is the set
 * that survives every markdown renderer worth targeting, including the ones
 * that are not this one. Widen it if your only consumer is `richBlocks` above,
 * and widen it in this file so all your canvases move together.
 *
 * Link stays on and is NOT taken from StarterKit — `LinkWithPreview` takes its
 * place, and two marks named "link" is a schema conflict, not a merge.
 */
export interface MarkdownExtensionsOptions {
  /**
   * Blockquotes, dividers and checklists.
   *
   * Off by default. These sit outside the floor above, and the floor exists
   * because a body is usually parsed by more than one thing — a mobile client,
   * a feed, a search indexer. A blockquote in a body that some other renderer
   * cannot draw is worse than one nobody can write.
   *
   * Turn it on for a surface whose bodies only ever reach THIS renderer.
   * Mirrors `ContentMarkdownRenderer`'s flag of the same name: the editor that
   * can produce these blocks and the renderer that can draw them are switched
   * on together, or an author writes something that silently disappears.
   */
  richBlocks?: boolean;
}

export function markdownExtensions(
  commands: SlashCommandItem[],
  { richBlocks = false }: MarkdownExtensionsOptions = {},
): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      blockquote: richBlocks ? undefined : false,
      horizontalRule: richBlocks ? undefined : false,
      // Off everywhere, including under `richBlocks`. Code blocks and ordered
      // lists are excluded for their own reasons, and italic/strike/underline
      // have no button anywhere in the kit — turning them on would only mean an
      // input rule producing a mark no toolbar can undo.
      code: false,
      codeBlock: false,
      orderedList: false,
      strike: false,
      italic: false,
      underline: false,
      link: false,
    }),
    // Checklists. `TaskItem` must be told it nests inside a `taskList`.
    ...(richBlocks ? [TaskList, TaskItem.configure({ nested: false })] : []),
    LinkWithPreview.configure({
      openOnClick: false, // clicking should put the caret there, not navigate
      autolink: false, // a pasted URL stays text until it's made a link
    }),
    // `inline: true` is NOT cosmetic — it is what keeps a body with two images
    // from corrupting itself on save.
    //
    // As a block node (the default), tiptap-markdown's serializer emits images
    // with no separator at all: two images and a bullet list come back as
    // `![a](x)![b](y)- one`, and the next load parses that trailing `- one` as
    // text rather than a list, escaping it to `\- one` on the save after that.
    // The list silently stops being a list.
    //
    // Inline, each image sits in its own paragraph and round trips as
    // `![a](x)\n\n![b](y)`, stable across any number of edits. A custom node
    // wrapping body content therefore must NOT name `image` in its content
    // expression — an inline node cannot be a direct child of a block-content
    // node. See `highlight-block-node.ts`.
    Image.configure({ inline: true }),
    Markdown.configure({
      // Raw HTML would pass straight through to wherever these bodies are
      // rendered, which may well not be able to draw it — and is an injection
      // surface on any renderer that can.
      html: false,
      bulletListMarker: "-",
      // Pasting markdown-looking text keeps it as TEXT. The paste path skips
      // the slash menu, so allowing it would be the one route left for a table
      // or a code fence to get into a body.
      transformPastedText: false,
    }),
    SlashCommand.configure({ commands }),
    // Records a pasted URL so `PasteLinkChooser` can offer to embed it. Pure
    // observation — it never rewrites the document on its own.
    PasteLink,
  ];
}

/**
 * Prose styling for a canvas that is one flat document.
 *
 * A canvas wrapping every block in its own node view (the changelog does) does
 * NOT need this — that node view styles its own body. Anything without a
 * wrapper node does: without these a heading is indistinguishable from a
 * paragraph and a bullet list has no bullets, so the author cannot see the
 * structure they are authoring.
 *
 * Mirrors `ContentMarkdownRenderer`'s scale rather than inventing an
 * editor-specific one, so what is typed here looks like what ships.
 *
 * `:not(.ProseMirror-separator)` on the image rules matters: ProseMirror
 * injects a zero-content `<img class="ProseMirror-separator">` after an inline
 * node at the end of a paragraph, and a bare `[&_img]` selector paints each one
 * as a full-width bordered box — an empty frame after every picture.
 */
export const CANVAS_PROSE = [
  "text-[15px] leading-relaxed text-muted-foreground",
  "[&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_img:not(.ProseMirror-separator)]:my-3 [&_img:not(.ProseMirror-separator)]:w-full",
  "[&_img:not(.ProseMirror-separator)]:max-w-lg [&_img:not(.ProseMirror-separator)]:rounded-xl",
  "[&_img:not(.ProseMirror-separator)]:border [&_img:not(.ProseMirror-separator)]:border-border/60",
  "[&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-ring",
  // ── `richBlocks` only ─────────────────────────────────────────────────────
  // Harmless on a canvas that cannot produce these: a selector matching no
  // element costs nothing, and keeping one prose string means the editor and
  // the published page cannot drift apart on how a quote looks.
  "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40",
  "[&_blockquote]:pl-4 [&_blockquote]:text-foreground",
  "[&_hr]:my-8 [&_hr]:border-t [&_hr]:border-border",
  // A selected divider is an atom with no text to highlight, so without this
  // there is no feedback that it is about to be replaced or deleted.
  "[&_hr.ProseMirror-selectednode]:border-ring",
  // Tiptap marks the list `data-type="taskList"` and each row `data-checked`,
  // which is what distinguishes these from plain bullets.
  "[&_ul[data-type=taskList]]:my-3 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li[data-checked]]:flex [&_li[data-checked]]:items-start [&_li[data-checked]]:gap-2",
  "[&_li[data-checked]>label]:mt-0.5 [&_li[data-checked]>label]:flex [&_li[data-checked]>label]:shrink-0",
  "[&_li[data-checked]_input]:size-3.5 [&_li[data-checked]_input]:accent-primary",
  "[&_li[data-checked]>div]:min-w-0 [&_li[data-checked]>div>p]:my-0",
  // Done items read as done. Muting the text is the only signal in the editor
  // that a box is ticked once the checkbox scrolls out of the eye's path.
  "[&_li[data-checked=true]>div]:text-muted-foreground [&_li[data-checked=true]>div]:line-through",
].join(" ");
