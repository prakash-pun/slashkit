/**
 * The platform-tagged image convention, and the parser and writer for it.
 *
 * Content often has to show the same instructional step twice — a phone
 * screenshot and a browser one — and let the reader pick. There is no markdown
 * syntax for that, so the tag rides in the ALT TEXT, which is the one part of
 * an image a markdown body can carry that renderers already read.
 *
 * Two shapes are accepted, and both are load-bearing:
 *
 *   `![ios](…)`                    → tag, no description
 *   `![Tap the + button|ios](…)`   → tag, plus alt text a reader can use
 *
 * The bare form is the naive one people reach for first and it still parses, so
 * nothing already authored breaks. The pipe form exists because the bare one
 * makes every screenshot announce itself to a screen reader as the word "ios" —
 * a real accessibility and SEO regression, since alt text is also what a search
 * engine reads. Write the pipe form for anything new; `buildPlatformAlt` does.
 *
 * The tag is matched on the LAST pipe segment, as an exact word,
 * case-insensitively. `![iOS Screenshot](…)` and `![web app](…)` are
 * DESCRIPTIONS, not tags, and must keep rendering on every platform — a
 * substring match would silently hide them, which is the specific mistake this
 * parser exists to avoid. Splitting on the last pipe rather than the first is
 * what lets a description contain one: `Choose A|B|ios` describes "Choose A|B".
 *
 * Anything that is not one of the known tags leaves the alt text completely
 * alone: with tags `["ios","web"]`, `Chart|2026` is a description, not a
 * malformed tag.
 */

/** The tags this convention ships with. Pass your own to every function below. */
export const DEFAULT_PLATFORM_TAGS = ["ios", "web"] as const;

export interface PlatformAltResult {
  /** `null` when the image is universal — rendered whatever is selected. */
  tag: string | null;
  /** What a screen reader should say. Empty for the bare legacy form. */
  displayAlt: string;
}

const normalise = (tags: readonly string[]) =>
  tags.map((tag) => tag.trim().toLowerCase());

export function parsePlatformAlt(
  alt: string | null | undefined,
  platformTags: readonly string[] = DEFAULT_PLATFORM_TAGS,
): PlatformAltResult {
  const raw = (alt ?? "").trim();
  if (!raw) return { tag: null, displayAlt: "" };

  const known = normalise(platformTags);

  const pipe = raw.lastIndexOf("|");
  if (pipe !== -1) {
    const candidate = raw.slice(pipe + 1).trim().toLowerCase();
    if (known.includes(candidate)) {
      return { tag: candidate, displayAlt: raw.slice(0, pipe).trim() };
    }
    // A pipe that is not a tag is just a character in the description.
    return { tag: null, displayAlt: raw };
  }

  const bare = raw.toLowerCase();
  if (known.includes(bare)) return { tag: bare, displayAlt: "" };

  return { tag: null, displayAlt: raw };
}

/**
 * The alt text to write for a platform screenshot — the inverse of the parse
 * above, kept beside it so the two cannot drift. This format is the entire
 * contract the reader-facing filtering rests on.
 *
 * `]`, `[` and newlines are stripped rather than escaped: they would end the
 * markdown image's alt span early and turn the rest of the description into
 * document text. A blank description falls back to the bare tag, which still
 * filters correctly — just without the accessibility benefit for that image.
 */
export function buildPlatformAlt(description: string, tag: string): string {
  const clean = description.replace(/[[\]\r\n]+/g, " ").trim();
  return clean ? `${clean}|${tag}` : tag;
}

/** An image tagged for a platform other than the one being viewed. */
export function isHiddenOnPlatform(
  alt: string | null | undefined,
  activePlatform: string,
  platformTags: readonly string[] = DEFAULT_PLATFORM_TAGS,
): boolean {
  const { tag } = parsePlatformAlt(alt, platformTags);
  return tag !== null && tag !== activePlatform;
}

const IMAGE_ALT = /!\[([^\]]*)\]\(/g;

/**
 * Whether a body has anything a platform toggle would actually change.
 *
 * Reads the markdown SOURCE rather than a rendered tree, because the answer is
 * usually needed by a server component before it renders anything — and it is
 * only ever used to decide whether to show the control at all. A body with no
 * tagged images gets no toggle: a switch that visibly does nothing when clicked
 * reads as broken, not as "nothing to switch".
 *
 * Runs the alt through the same parser the renderer uses rather than its own
 * regex, so a toggle can never appear for images the renderer would not filter,
 * or the reverse.
 */
export function hasPlatformImages(
  body: string,
  platformTags: readonly string[] = DEFAULT_PLATFORM_TAGS,
): boolean {
  for (const [, alt] of body.matchAll(IMAGE_ALT)) {
    if (parsePlatformAlt(alt, platformTags).tag) return true;
  }
  return false;
}
