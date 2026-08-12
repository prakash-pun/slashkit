import type { Editor, Range } from "@tiptap/core";
import {
  Bold,
  ChevronRight,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Smartphone,
  TextQuote,
  Video,
  type LucideIcon,
} from "lucide-react";

import { SUMMARY_INPUT_ATTR } from "@/components/slashkit/details-block-view";

import { safeUrl } from "@/lib/slashkit/link-kind";
import { buildPlatformAlt } from "@/lib/slashkit/parse-platform-alt";

/**
 * The `/` menu's vocabulary.
 *
 * ── Why the command set is a per-editor option ─────────────────────────────
 * Different surfaces do NOT take the same set, and the difference is structural
 * rather than cosmetic. `/highlight` inserts a `highlightBlock`, a node that
 * only exists where you registered that extension — offering it elsewhere
 * throws on `state.schema.nodes.highlightBlock` being undefined. `/screenshot`
 * writes the platform-tagged alt format, which only a renderer configured for
 * platform filtering reads; anywhere else the tag is meaningless text baked
 * into the alt. So each editor passes the set it can actually honour.
 *
 * ── Why the shared set is deliberately short ───────────────────────────────
 * It exposes exactly the markdown `markdownExtensions` leaves enabled, and
 * nothing else. Tiptap makes tables, code blocks and task lists trivial to add
 * here — and anything added that the schema does not have would look correct in
 * this menu and then throw or silently no-op. The guard has to be the list not
 * existing.
 *
 * The matching half of that guard lives in `markdownExtensions`, which switches
 * the same block types off in StarterKit — otherwise markdown INPUT RULES would
 * let someone produce a blockquote by typing "> " even though no command offers
 * one.
 */
export interface SlashCommandItem {
  title: string;
  icon: LucideIcon;
  command: (props: { editor: Editor; range: Range }) => void;
}

/** Alias for the name §3d of the spec uses. Same thing. */
export type SlashCommandDefinition = SlashCommandItem;

/** The exact link text every renderer in the kit detects a video by. */
export const VIDEO_LINK_TEXT = "video";

// ─────────────────────────────────────────────────────────────────────────────
// THE CALLBACK SEAM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Everything a command needs that Slashkit refuses to decide for you.
 *
 * `onUploadImage` is the only genuinely required one, and it is required
 * precisely because it is the one that touches a network. Slashkit never
 * uploads anything: you receive nothing and resolve a public URL, or resolve
 * `null` for a cancel or a failure. Both are handled the same way — by
 * inserting nothing — so a rejected file needs no special path here.
 *
 * `createImagePicker` in `upload.ts` builds a conforming `onUploadImage` from a
 * single `upload(file)` function if you want the file-picker half for free.
 *
 * The prompt callbacks default to `window.prompt`, which is a browser API and
 * not a network call — replace them with a real dialog when you want one.
 */
export interface DefaultCommandsOptions {
  /** Resolve a public URL for an image, or `null` to insert nothing. */
  onUploadImage: () => Promise<string | null>;
  /** Ask for a video URL. Defaults to `window.prompt`, validated. */
  onPromptVideoUrl?: () => Promise<string | null>;
  /** Ask for a link URL. Defaults to `window.prompt`, validated. */
  onPromptLinkUrl?: () => Promise<string | null>;
  /**
   * Ask what the link should SAY. Defaults to `window.prompt` seeded with the
   * URL. Asked separately because the menu is opened on an empty line: with
   * nothing selected, `setLink` would apply a mark to no text at all and appear
   * to do nothing.
   */
  onPromptLinkText?: (url: string) => Promise<string | null>;
}

/**
 * Asks for a URL and validates it. Returns `null` on cancel or a bad scheme.
 *
 * Exported so a toolbar's link button runs the SAME `safeUrl` check as the
 * slash command. One validator behind two prompts, rather than a second
 * `window.prompt` somewhere that forgets to block `javascript:`.
 */
export function promptForLink(message = "URL"): string | null {
  return safeUrl(window.prompt(message) ?? "");
}

const resolvedPrompts = (options: DefaultCommandsOptions) => ({
  videoUrl:
    options.onPromptVideoUrl ??
    (async () => promptForLink("Video URL (YouTube, Loom, direct link…)")),
  linkUrl: options.onPromptLinkUrl ?? (async () => promptForLink("URL")),
  linkText:
    options.onPromptLinkText ??
    (async (url: string) => window.prompt("Link text", url)?.trim() || url),
});

// ─────────────────────────────────────────────────────────────────────────────
// THE SHARED SET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Heading, subheading, bullets, bold, image, video, link.
 *
 * Every surface can honour all seven — they need no node beyond what
 * `markdownExtensions` always registers.
 */
export function defaultCommands(
  options: DefaultCommandsOptions,
): SlashCommandItem[] {
  const prompt = resolvedPrompts(options);

  return [
    {
      title: "Heading",
      icon: Heading2,
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 2 })
          .run(),
    },
    {
      title: "Subheading",
      icon: Heading3,
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 3 })
          .run(),
    },
    {
      title: "Bullet list",
      icon: List,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered list",
      icon: ListOrdered,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Quote",
      icon: TextQuote,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Divider",
      icon: Minus,
      // `setHorizontalRule` inserts the rule AND a paragraph after it, so the
      // caret lands on a writable line rather than on the rule itself — which
      // is an atom, and typing with it selected would replace it.
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Collapsible section",
      icon: ChevronRight,
      // Inserted OPEN, with the caret sent to the summary field. A collapsed
      // empty section is a box with nothing in it and no obvious way in.
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "detailsBlock",
            attrs: { summary: "", open: true },
            content: [{ type: "paragraph" }],
          })
          .run();

        // The summary is a DOM input rather than document content, so the
        // selection cannot reach it — focus it once the node view has mounted.
        requestAnimationFrame(() => {
          editor.view.dom
            .querySelectorAll<HTMLInputElement>(`input[${SUMMARY_INPUT_ATTR}]`)
            .forEach((input, _i, all) => {
              if (input === all[all.length - 1]) input.focus();
            });
        });
      },
    },
    {
      title: "Bold text",
      icon: Bold,
      // Nothing is selected at this point, so this sets the STORED mark:
      // whatever is typed next comes out bold, which is what "bold text" means
      // from a menu you opened on an empty line.
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBold().run(),
    },
    {
      title: "Inline code",
      icon: Code,
      // Same stored-mark reasoning as Bold above. Inline only — a fenced code
      // block is a different feature, and `markdownExtensions` says why.
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCode().run(),
    },
    {
      title: "Image",
      icon: ImageIcon,
      command: ({ editor, range }) => {
        // The range is deleted BEFORE the upload, not after. `range` is a pair
        // of document POSITIONS, and awaiting a file picker leaves them
        // describing wherever the "/image" text used to be — if anything
        // shifted meanwhile, deleting it afterwards eats the wrong characters.
        // Insert at the live selection once the URL is back instead.
        editor.chain().focus().deleteRange(range).run();

        void options.onUploadImage().then((url) => {
          if (!url) return;
          editor.chain().focus().setImage({ src: url }).run();
        });
      },
    },
    {
      title: "Video",
      icon: Video,
      // Never an upload. A video is always a link to wherever it already lives
      // — self-hosting video is real infrastructure for very little payoff. This
      // command exists so nobody has to remember that the convention is a link
      // whose text is exactly "video"; it always writes that shape.
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();

        void prompt.videoUrl().then((raw) => {
          const url = raw ? safeUrl(raw) : null;
          if (!url) return;

          editor
            .chain()
            .focus()
            .insertContent({
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: VIDEO_LINK_TEXT,
                  marks: [{ type: "link", attrs: { href: url } }],
                },
              ],
            })
            .run();
        });
      },
    },
    {
      title: "Link",
      icon: LinkIcon,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();

        void prompt.linkUrl().then(async (raw) => {
          const url = raw ? safeUrl(raw) : null;
          if (!url) return;

          const text = (await prompt.linkText(url))?.trim() || url;

          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              text,
              marks: [{ type: "link", attrs: { href: url } }],
            })
            .run();
        });
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// OPT-IN SETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checklists — the one command still gated.
 *
 * `toggleTaskList` throws on a schema that has no `taskList` node, so this
 * belongs only in an editor built with `markdownExtensions(commands, {
 * taskLists: true })`. The two switch on together or not at all.
 *
 * Quote, divider and collapsible section used to live here too. They are in the
 * shared set now: all three are either CommonMark or explicit HTML, so they
 * carry no rendering risk that would justify hiding them from a surface.
 */
export const taskListCommands: SlashCommandItem[] = [
  {
    title: "Checklist",
    icon: ListChecks,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
];

/**
 * @deprecated Renamed to `taskListCommands`, and narrowed — quote, divider and
 * collapsible section moved into `defaultCommands`. Kept so an existing call
 * site keeps compiling; it no longer adds the three block commands, because
 * those would then appear twice in the menu.
 */
export const richBlockCommands = taskListCommands;

/** What a `/screenshot` dialog hands back. See the `screenshot-dialog` item. */
export interface PlatformScreenshots {
  /** One description for every image — it becomes each one's alt text. */
  description: string;
  /** Tag → URL. A tag the author skipped is absent or null, which is fine. */
  urls: Record<string, string | null>;
}

/**
 * Uploads the same step on several platforms and inserts each, tagged.
 *
 * The alt text is built by `buildPlatformAlt`, never assembled inline — the
 * exact tag strings are the entire contract the reader-facing filtering rests
 * on, so there is one place that writes them and one place that reads them. A
 * tag this command gets wrong is an image that silently shows everywhere.
 *
 * `onRequest` is yours: it must resolve the description and the URLs, or `null`
 * for a cancel. The `screenshot-dialog` item is a working implementation.
 */
export function screenshotCommand(
  onRequest: () => Promise<PlatformScreenshots | null>,
  /** The order images are inserted in. */
  platformTags: readonly string[] = ["ios", "web"],
): SlashCommandItem {
  return {
    title: "Screenshot",
    icon: Smartphone,
    command: ({ editor, range }) => {
      // Range deleted before the dialog, same reasoning as the Image command.
      editor.chain().focus().deleteRange(range).run();

      void onRequest().then((result) => {
        if (!result) return;

        for (const tag of platformTags) {
          const url = result.urls[tag];
          if (!url) continue;

          editor
            .chain()
            .focus()
            .setImage({ src: url, alt: buildPlatformAlt(result.description, tag) })
            // A trailing paragraph so the caret lands on a fresh line rather
            // than beside the image, where the next thing typed would look like
            // a caption.
            .insertContent({ type: "paragraph" })
            .run();
        }
      });
    },
  };
}
