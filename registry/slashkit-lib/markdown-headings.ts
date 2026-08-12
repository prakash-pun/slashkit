import { slugify } from "@/lib/slashkit/slug";

/**
 * The anchor id for a heading, derived from its own text.
 *
 * Used in two places that MUST agree: the renderer stamps it onto the `<h2>`,
 * and the table of contents links to it. A second slug rule anywhere would
 * produce a contents list whose links all go nowhere, and nothing would fail
 * loudly — the page would just quietly not scroll.
 *
 * Falls back to a positional id for a heading whose text slugifies to nothing
 * ("###", or one that is only an emoji), because an empty `id=""` is not a
 * valid anchor target and every such heading would collide with the others.
 */
export function headingId(text: string, index = 0): string {
  return slugify(text) || `section-${index + 1}`;
}

export interface DocHeading {
  /** 2 or 3 — the only levels the editor can produce. */
  level: number;
  text: string;
  id: string;
}

/**
 * Every heading in a markdown body, in document order.
 *
 * Read off the SOURCE rather than the rendered tree, because the consumer is
 * usually a server component that needs the list before it renders anything,
 * and because parsing markdown twice to ask one question about it would be the
 * expensive way round.
 *
 * Safe as a line regex specifically because the editor cannot produce a fenced
 * code block — `codeBlock: false` in `markdownExtensions` — so there is no
 * context in which a leading `##` means something other than a heading. That
 * stops being true the moment you enable code blocks.
 */
export function extractHeadings(body: string): DocHeading[] {
  const headings: DocHeading[] = [];

  for (const line of body.split("\n")) {
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    // Inline marks are markup, not words: a heading written as
    // "## The **big** idea" should read "The big idea" in the contents.
    const text = match[2]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/(\*\*|__|~~|`)/g, "")
      .trim();

    if (!text) continue;

    headings.push({
      level: match[1].length,
      text,
      id: headingId(text, headings.length),
    });
  }

  return headings;
}
