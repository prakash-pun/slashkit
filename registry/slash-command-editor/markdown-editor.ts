import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "tiptap-markdown";

import { LinkWithPreview } from "@/lib/slashkit/link-with-preview";
import { UnderlineWithMarkdown } from "@/lib/slashkit/underline-mark";
import { DetailsBlock } from "@/lib/slashkit/details-block";
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
 * ── The vocabulary, and why it stops where it does ─────────────────────────
 * Everything below is enabled everywhere:
 *
 *   headings (2–3) · paragraphs · bullet lists · ordered lists · bold · italic
 *   strike · inline code · links · images · blockquotes · dividers · collapsible
 *   sections · underline
 *
 * Two things stay OFF, and both for a reason rather than by omission:
 *
 *   `codeBlock` — a fenced block is a different feature from inline code: it
 *     wants a language picker, syntax highlighting and a copy button, none of
 *     which exist here. Leaving it off also keeps `extractHeadings`' line regex
 *     honest, since a `##` inside a fence would otherwise parse as a heading.
 *
 *   tables — no node, no command, and no way to edit one comfortably in a
 *     canvas this size. The renderer will DRAW a pasted one (remark-gfm is on),
 *     which is the safe direction for the asymmetry to run.
 *
 * ── Why the list is still explicit rather than "StarterKit defaults" ───────
 * Because the schema is the contract. Every mark and node named here has a
 * button or a command that can produce it and a renderer that can draw it, and
 * the only way to keep that true is to write the set down. An extension turned
 * on by accident is an input rule producing a mark no toolbar can undo.
 *
 * ── The two that are HTML, not markdown ────────────────────────────────────
 * `underline` and `detailsBlock` have no markdown syntax and round trip as
 * `<u>` and `<details>`. That is why `html: true` below, and why any renderer
 * showing these bodies has to allow raw HTML. See those two files for the full
 * argument and for how to drop them if that trade is wrong for you.
 */
export interface MarkdownExtensionsOptions {
  /**
   * Task lists — `- [ ] item`.
   *
   * The one construct still gated, because it is the one whose rendering
   * genuinely varies: it needs `remark-gfm` on the renderer and it degrades to
   * the literal text `[ ]` anywhere that does not have it. Everything else in
   * the vocabulary above is either CommonMark or explicit HTML, which is far
   * more portable.
   *
   * Mirrors `ContentMarkdownRenderer`'s flag of the same name: the editor that
   * can PRODUCE these and the renderer that can DRAW them switch on together,
   * or an author writes something that silently disappears.
   */
  taskLists?: boolean;
}

export function markdownExtensions(
  commands: SlashCommandItem[],
  { taskLists = false }: MarkdownExtensionsOptions = {},
): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      // See the note above — a fenced block is its own feature.
      codeBlock: false,
      // Replaced below by versions that can round trip through markdown. Two
      // marks of the same name is a hard schema conflict, not a merge.
      link: false,
      underline: false,
    }),
    UnderlineWithMarkdown,
    DetailsBlock,
    // Task lists. `TaskItem` must be told it nests inside a `taskList`.
    ...(taskLists ? [TaskList, TaskItem.configure({ nested: false })] : []),
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
    // node. See `highlight-block-node.ts` and `details-block.ts`.
    Image.configure({ inline: true }),
    Markdown.configure({
      // ON, and this is a real decision rather than a default.
      //
      // `<u>` and `<details>` are the only way to represent underline and a
      // collapsible section, so the serializer has to be allowed to emit them
      // and the parser has to be allowed to read them back. The cost is that a
      // body can now contain arbitrary HTML — which is fine while the only
      // authors are trusted, and is exactly why `ContentMarkdownRenderer` puts
      // `rehype-sanitize` in front of `rehype-raw` rather than trusting it.
      //
      // Pasting is still guarded separately, below.
      html: true,
      bulletListMarker: "-",
      // Pasting markdown-looking TEXT keeps it as text. The paste path skips
      // the slash menu, so allowing it would be the one route left for a code
      // fence to get into a body — and now that `html` is on, for a `<script>`
      // to be typed in as plain text and become real markup on save.
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
  "[&_em]:italic [&_s]:line-through [&_u]:underline [&_u]:underline-offset-2",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  // Inline code, distinguished by its background rather than a border — a
  // bordered inline span breaks the line's rhythm at every occurrence.
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5",
  "[&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_img:not(.ProseMirror-separator)]:my-3 [&_img:not(.ProseMirror-separator)]:w-full",
  "[&_img:not(.ProseMirror-separator)]:max-w-lg [&_img:not(.ProseMirror-separator)]:rounded-xl",
  "[&_img:not(.ProseMirror-separator)]:border [&_img:not(.ProseMirror-separator)]:border-border/60",
  "[&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-ring",
  // A quote reads as a quote by its rule and its weight, not by italics or
  // quotation marks — those fight with the bold and links inside it.
  "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40",
  "[&_blockquote]:pl-4 [&_blockquote]:text-foreground",
  "[&_hr]:my-8 [&_hr]:border-t [&_hr]:border-border",
  // A selected divider is an atom with no text to highlight, so without this
  // there is no feedback that it is about to be replaced or deleted.
  "[&_hr.ProseMirror-selectednode]:border-ring",
  // ── Task lists (`taskLists` only) ─────────────────────────────────────────
  // Harmless on a canvas that cannot produce them: a selector matching no
  // element costs nothing, and keeping one prose string means the editor and
  // the published page cannot drift apart on how a checklist looks.
  "[&_ul[data-type=taskList]]:my-3 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li[data-checked]]:flex [&_li[data-checked]]:items-start [&_li[data-checked]]:gap-2",
  "[&_li[data-checked]>label]:mt-0.5 [&_li[data-checked]>label]:flex [&_li[data-checked]>label]:shrink-0",
  "[&_li[data-checked]_input]:size-3.5 [&_li[data-checked]_input]:accent-primary",
  "[&_li[data-checked]>div]:min-w-0 [&_li[data-checked]>div>p]:my-0",
  // Done items read as done. Muting the text is the only signal in the editor
  // that a box is ticked once the checkbox scrolls out of the eye's path.
  "[&_li[data-checked=true]>div]:text-muted-foreground [&_li[data-checked=true]>div]:line-through",
].join(" ");
