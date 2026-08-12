/**
 * The URL a title becomes.
 *
 * Deliberately narrow — lowercase, digits and single hyphens — because the
 * result ends up in a public URL. Anything outside that set collapses to a
 * hyphen rather than being percent-encoded, which would be legal and
 * unreadable.
 *
 * One implementation, shared: two copies would mean the same title suggesting
 * two different URLs depending on which screen you were on, and the difference
 * would only surface once something was already published at one of them.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
