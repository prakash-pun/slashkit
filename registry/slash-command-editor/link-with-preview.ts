import { Link } from "@tiptap/extension-link";
import { ReactMarkViewRenderer } from "@tiptap/react";

import { LinkMarkView } from "@/components/slashkit/link-mark-view";

/**
 * The Link mark, drawn as a preview card while authoring.
 *
 * EXTENDS the built-in rather than adding a second link mark — StarterKit
 * already registers one, and two marks of the same name is a hard schema
 * conflict, not a merge. `markdownExtensions` therefore sets `link: false` on
 * StarterKit and installs this instead, which keeps every one of the built-in's
 * behaviours (paste handling, href validation, the `setLink` command the slash
 * menu and bubble menu use) and only changes how it RENDERS.
 *
 * Nothing about the DOCUMENT changes — this is still a plain link mark, so a
 * body still serialises to `[text](href)` exactly as before. The card is purely
 * a view.
 */
export const LinkWithPreview = Link.extend({
  addMarkView() {
    return ReactMarkViewRenderer(LinkMarkView);
  },
});
