/**
 * Open Graph metadata for a link, and the seam through which Slashkit gets it.
 *
 * ── Why there is no fetch in this file ─────────────────────────────────────
 * Rich link cards need metadata from somewhere else's server, and "somewhere
 * else's server" is exactly what a component copied into your project must not
 * decide for you. Scraping Open Graph tags is a SERVER job — it needs SSRF
 * protection, a timeout, a cache and a user agent, none of which belong in a
 * component and none of which can run in a browser anyway (CORS).
 *
 * So the kit defines the SHAPE and you supply the values:
 *
 *   • On a server-rendered page, fetch previews yourself and pass a `PreviewMap`
 *     to the renderer as a prop. Nothing here runs at all — the cards are baked
 *     into static HTML with no client request, no spinner and no layout shift.
 *     This is the recommended path.
 *
 *   • Inside the EDITOR, where the author is typing URLs that no server render
 *     could have anticipated, register a resolver once with
 *     `configureLinkPreviews`. The cache below is what stops a mark view
 *     re-rendering on every keystroke from turning typing into a request storm.
 *
 * Register nothing and every card degrades to its plain form, which is a
 * supported state throughout — not a broken one.
 */

export interface LinkPreview {
  /** The normalised URL that was fetched. Link out using the authored href. */
  url: string;
  title?: string | null;
  /** Absolute URL on the origin site's CDN. Public, unsigned, may 404. */
  imageUrl?: string | null;
  faviconUrl?: string | null;
  siteName?: string | null;
  /** A failure still returns a row — the caller shows the plain link. */
  fetchStatus: "success" | "failed";
  /**
   * Set only for a recognised video host. Drives the play affordance and the
   * wide thumbnail.
   *
   * NOT what decides whether something renders as a *video card* — that stays
   * the `[video](…)` text convention. A YouTube link written as
   * `[the announcement](…)` is an ordinary link card that happens to have good
   * metadata, which is exactly what the convention was chosen to guarantee.
   */
  provider?: "youtube" | "vimeo" | null;
  /** oEmbed `author_name` — the channel, worth a line under a video title. */
  author?: string | null;
}

/** Previews keyed by the href exactly as authored in the markdown. */
export type PreviewMap = Record<string, LinkPreview>;

/** What you register. Resolve `null` for "no metadata", never throw. */
export type LinkPreviewResolver = (href: string) => Promise<LinkPreview | null>;

let resolver: LinkPreviewResolver | null = null;

/**
 * Teaches the editor how to look a URL up. Call once, at app start.
 *
 * Module state rather than a React context because the consumers are a
 * ProseMirror mark view and a plugin, neither of which sits reliably under a
 * provider. Pass `null` to turn previews back off.
 *
 *     configureLinkPreviews(async (href) => {
 *       const res = await fetch(`/api/link-preview?url=${encodeURIComponent(href)}`);
 *       return res.ok ? res.json() : null;
 *     });
 */
export function configureLinkPreviews(next: LinkPreviewResolver | null): void {
  resolver = next;
}

/**
 * Previews already resolved, for the life of the page.
 *
 * A miss is cached as `null` deliberately: a flaky network must not turn every
 * re-render into another attempt.
 */
const cache = new Map<string, LinkPreview | null>();
const inflight = new Map<string, Promise<LinkPreview | null>>();

/** The already-resolved preview for a URL, if there is one. Never fetches. */
export function peekPreview(href: string): LinkPreview | null {
  return cache.get(href) ?? null;
}

/**
 * The preview for a URL, resolving through the registered resolver at most
 * once per URL per page. Resolves `null` when nothing is registered.
 */
export function loadPreview(href: string): Promise<LinkPreview | null> {
  const cached = cache.get(href);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inflight.get(href);
  if (existing) return existing;

  if (!resolver) return Promise.resolve(null);

  const request = resolver(href)
    .then((preview) => {
      cache.set(href, preview);
      return preview;
    })
    .catch(() => {
      cache.set(href, null);
      return null;
    })
    .finally(() => inflight.delete(href));

  inflight.set(href, request);
  return request;
}

/**
 * Seeds the cache from previews already resolved on the server.
 *
 * Worth calling when an editor opens on a saved body: the links in it were
 * previewed for the public page already, and re-resolving them client-side
 * would be the same answer at the cost of a round trip each.
 */
export function primeLinkPreviews(previews: PreviewMap): void {
  for (const [href, preview] of Object.entries(previews)) {
    cache.set(href, preview);
  }
}
