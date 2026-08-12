/**
 * A body as plain prose — for a meta description, a JSON-LD `description`, an
 * RSS summary, or an auto-generated excerpt. None of those may contain markup.
 *
 * A crude strip, NOT a real markdown parse: every consumer truncates to a
 * couple of hundred characters anyway, so precision past "reads as a sentence"
 * buys nothing. What it does have to get right is never leaking SYNTAX — a URL
 * or an alt tag in a search snippet is worse than a short description.
 *
 * Each rule below is here because of a specific leak. Read the comments before
 * reordering anything; several of them depend on running before another.
 */
export function stripMarkdown(body: string): string {
  return (
    body
      // Images: neither half is prose. Must run BEFORE the link rule below,
      // whose pattern would otherwise match the `[alt](url)` inside `![…]`. An
      // article that opens with a screenshot would otherwise spend its whole
      // description on a blob-store URL — and with the `description|ios` alt
      // convention it would leak the platform tag too.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // A `[video](…)` link is a CARD MARKER, not prose — the word "video" is
      // the convention that turns it into a player, so it is the one link whose
      // label says nothing about the content and goes whole.
      .replace(/\[[ \t]*video[ \t]*\]\([^)]*\)/gi, "")
      // A link whose LABEL is itself a URL goes whole too. That is exactly what
      // pasting a URL produces — `[https://…](https://…)` — so keeping the label
      // would put a raw href into every excerpt, meta description, JSON-LD
      // description and RSS item. A URL is not a sentence.
      .replace(/\[\s*<?https?:\/\/[^\]]*\]\([^)]*\)/gi, "")
      // …and the same link in markdown's OTHER syntax. A link whose text is its
      // own href is serialised by prosemirror-markdown as the autolink
      // `<https://…>`, not as `[https://…](https://…)`, so the rule above never
      // sees the shape it was written for and every pasted URL goes straight
      // into the description anyway.
      .replace(/<https?:\/\/[^>\s]*>/gi, "")
      // Every other link keeps its LABEL and loses the URL. The label is real
      // prose an author wrote — dropping it too leaves "Read the  for the full
      // detail", a visibly broken sentence in the snippet.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Line-leading syntax: heading hashes, blockquote arrows, list markers.
      .replace(/^[ \t]{0,3}(?:#{1,6}|>|[-*+])[ \t]+/gm, "")
      // Emphasis and code, only in EMPHASIS POSITION — `**a**`, `_a_`, `` `a` ``.
      // Deliberately not a blanket character class: stripping `-` and `_`
      // everywhere quietly turns "well-known" into "wellknown" and
      // "snake_case" into "snakecase" in every description containing one. A
      // hyphen is never emphasis, so it is not in this set at all.
      .replace(/(\*\*|__|~~)(.*?)\1/g, "$2")
      .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * `stripMarkdown`, cut to a length a search engine will actually display.
 *
 * Cuts on a WORD boundary — a description ending mid-word looks truncated by
 * accident rather than by design.
 */
export function excerptFrom(body: string, max = 160): string {
  const text = stripMarkdown(body);
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
