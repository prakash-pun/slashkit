/**
 * The links in a body that will render as CARDS.
 *
 * Feed the result to your own metadata resolver, and pass what comes back to a
 * renderer as `previews`. Doing it this way is what makes the cards part of a
 * page's static HTML: one round of outbound requests per revalidation rather
 * than per visitor, each individually allowed to fail, and a link whose
 * metadata did not come back simply stays a plain link.
 *
 * Only WHOLE-LINE links qualify — a line whose entire content is one markdown
 * link. An inline link inside a sentence stays inline, because swapping it for
 * a block card would tear the sentence in half, so there is nothing to preview
 * and no reason to spend a fetch on it.
 *
 * Images (`![alt](url)`) are excluded by the leading `!`: they already render
 * as the picture itself, which is a better preview than any card.
 */
const LONE_LINK_LINE = /^\[([^\]]*)\]\(([^)\s]+)\)$/;

/**
 * The same thing in markdown's OTHER link syntax: `<https://…>`.
 *
 * Not an exotic shape to support — it is what the editor WRITES. A pasted URL
 * becomes a link whose text is its own href, and prosemirror-markdown
 * serialises exactly that case as an autolink rather than as
 * `[https://…](https://…)`. Matching only the bracket form means every pasted
 * link is skipped here, so no metadata is ever resolved for it, and the
 * renderer — which finds the link perfectly well, since CommonMark parses
 * autolinks — falls through to drawing a bare underlined URL. The card was
 * never broken; it was never given anything to draw.
 */
const LONE_AUTOLINK_LINE = /^<(https?:\/\/[^>\s]+)>$/;

export interface BodyLink {
  href: string;
  /** The visible text — `"video"` is the video-card convention. */
  label: string;
}

/** Whole-line links in one body, in order. */
export function loneLinksIn(body: string): BodyLink[] {
  const links: BodyLink[] = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();

    const match = LONE_LINK_LINE.exec(trimmed);
    if (match) {
      links.push({ label: match[1].trim(), href: match[2] });
      continue;
    }

    // An autolink has no separate label, so its href is its text — which is
    // what the renderer sees too, and why it can never be the `video` marker.
    const autolink = LONE_AUTOLINK_LINE.exec(trimmed);
    if (autolink) links.push({ label: autolink[1], href: autolink[1] });
  }

  return links;
}

/** Every card-worthy href across a set of bodies, deduplicated. */
export function collectPreviewableHrefs(bodies: string[]): string[] {
  const hrefs = bodies.flatMap((body) => loneLinksIn(body).map((l) => l.href));
  return [...new Set(hrefs)];
}
