import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { isImageUrl, isVideoUrl } from "@/lib/slashkit/link-kind";

/**
 * Handles a bare URL paste, so the editor can offer to embed it.
 *
 * ── Why this is a plugin and not a paste handler on the Link extension ─────
 * Tiptap's Link already handles pastes: it turns a URL pasted OVER a selection
 * into a link on that text. That behaviour is right and is left alone. What is
 * missing is the other case — a URL pasted on its own, where the author almost
 * certainly means "put the thing here", and an editor typically just drops in
 * an underlined URL and leaves them to it.
 *
 * ── Why it inserts the link itself ─────────────────────────────────────────
 * Left to the default paste, what a lone URL becomes depends on the CLIPBOARD,
 * not on the editor: copy a link from a page and the `text/html` flavour makes
 * it a link mark; copy the same URL out of the address bar and there is no HTML
 * flavour, so it lands as inert text. `autolink` is off (deliberately — see
 * `markdownExtensions`), so nothing corrects the second case, and the published
 * page then shows a URL that is not even clickable. Inserting the link mark
 * here makes both pastes produce the same document.
 *
 * What it does NOT do is decide the URL is an embed. The author chooses, from
 * the chooser this records the position for: rewriting first and offering an
 * undo afterwards is the pattern that makes people distrust an editor. Ignore
 * it and a link is what stays — which is what they pasted.
 */

export interface PastedLink {
  url: string;
  /** Document positions of the pasted text, for replacing it in place. */
  from: number;
  to: number;
  /** What the URL looks like it wants to be — drives which options show. */
  isImage: boolean;
  isVideo: boolean;
}

export const pasteLinkKey = new PluginKey<PastedLink | null>("pastedLink");

/** A paste that is one URL and nothing else. Trimmed, so a trailing \n is fine. */
function loneUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:"
      ? trimmed
      : null;
  } catch {
    return null;
  }
}

export const PasteLink = Extension.create({
  name: "pasteLink",

  addProseMirrorPlugins() {
    return [
      new Plugin<PastedLink | null>({
        key: pasteLinkKey,

        state: {
          init: () => null,

          apply(tr, previous) {
            // A paste sets this meta; anything else clears it as soon as the
            // document moves, so the chooser cannot linger over text that is no
            // longer what was pasted.
            const pasted = tr.getMeta(pasteLinkKey) as PastedLink | undefined;
            if (pasted !== undefined) return pasted;

            if (!previous) return null;
            if (!tr.docChanged) return previous;

            // The document changed for some other reason — the author kept
            // typing. Map the recorded range forward so the chooser stays
            // anchored, and drop it if the text it pointed at is gone.
            const from = tr.mapping.map(previous.from, -1);
            const to = tr.mapping.map(previous.to, 1);
            return to > from ? { ...previous, from, to } : null;
          },
        },

        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            const url = loneUrl(text);
            if (!url) return false;

            const { state } = view;
            const { selection } = state;

            // A URL pasted OVER something is a label being given a target, not
            // a thing to embed — there is nothing to offer, and Link's own
            // paste handler already does the right thing with it. Returning
            // false hands it back to that handler untouched.
            if (!selection.empty) return false;

            const linkType = state.schema.marks.link;
            if (!linkType) return false;

            const from = selection.from;
            const tr = state.tr.replaceSelectionWith(
              state.schema.text(url, [linkType.create({ href: url })]),
              // Explicit marks, not the ones at the cursor — inheriting would
              // paste a link inside a link when the caret sits in one.
              false,
            );

            // Otherwise the next character typed keeps extending the link.
            tr.removeStoredMark(linkType);

            // Same transaction as the insertion, so the chooser can never be
            // read against a document that does not have the link in it yet.
            tr.setMeta(pasteLinkKey, {
              url,
              from,
              to: from + url.length,
              isImage: isImageUrl(url),
              isVideo: isVideoUrl(url),
            } satisfies PastedLink);

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
