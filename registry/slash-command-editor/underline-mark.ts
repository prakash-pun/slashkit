import { Underline } from "@tiptap/extension-underline";

/**
 * Underline, taught to survive a markdown round trip.
 *
 * ── The problem ────────────────────────────────────────────────────────────
 * Markdown has no underline. Not a niche gap — there is simply no syntax for
 * it, in CommonMark or GFM or anywhere else. `_text_` is emphasis and `__text__`
 * is strong; neither means underline, and reusing one would make bold and
 * underline the same mark on save.
 *
 * Without the storage below, `tiptap-markdown` has no serializer for this mark
 * and drops it: the author underlines a phrase, saves, reloads, and the
 * underline is gone with no error anywhere. Silent data loss is the worst
 * failure mode available, so the choice is to serialise it as HTML or not to
 * offer the mark at all.
 *
 * ── The trade-off you are accepting by installing this ─────────────────────
 * `<u>` in the body means the body is no longer pure markdown. Any renderer
 * that shows it must allow raw HTML — `ContentMarkdownRenderer` does, through
 * `rehype-raw` behind a `rehype-sanitize` allowlist. A renderer that does not
 * will print the tags as literal text.
 *
 * If your bodies are read by anything you do not control, drop this extension
 * and the Underline button in `editor-menus.tsx` together. Bold and italic
 * cover emphasis, and on the web an underline reads as a link anyway — which is
 * the honest argument for leaving it out even when you can have it.
 */
export const UnderlineWithMarkdown = Underline.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open: "<u>",
          close: "</u>",
          // Lets it interleave with bold and italic rather than forcing a
          // close-and-reopen around every overlapping mark.
          mixable: true,
          // Keeps ` <u>text</u>` from becoming `<u> text</u>`, which renders
          // with the space underlined and the phrase visibly off by one.
          expelEnclosingWhitespace: true,
        },
      },
    };
  },
});
