/**
 * What a URL most likely wants to become.
 *
 * Pure and client-safe — nothing here fetches. That matters because the paste
 * chooser has to offer its options the instant something lands in the editor,
 * before any metadata request could have come back, and possibly before the
 * author has finished typing.
 */

export type LinkKind = "image" | "video" | "link";

/**
 * Hosts whose links can become a `[video](…)` card.
 *
 * Deliberately a list rather than a heuristic: a host missing here costs a
 * suggestion in the paste chooser, nothing more. Add your own by editing this
 * set — that is the point of the file being copied into your project.
 */
const VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
  "loom.com",
  "www.loom.com",
  "dailymotion.com",
  "www.dailymotion.com",
  "dai.ly",
  "streamable.com",
  "www.streamable.com",
]);

/** Extensions worth rendering as a picture rather than linking to. */
const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

/**
 * Extensions that ARE a video, whoever is hosting them.
 *
 * A host list alone misses the case an author hits most often after the big
 * three — a file on their own bucket or CDN. Those get the card that links out,
 * the same as Loom and Vimeo, so nothing downstream has to learn a new shape.
 */
const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm)$/i;

function parse(url: string): URL | null {
  try {
    const parsed = new URL(url.trim());
    // http(s) only. A `data:` or `blob:` URL is not something to embed from a
    // paste, and anything else is not fetchable by a reader's browser.
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Whether a URL points at an image.
 *
 * Decided by the PATH's extension, ignoring the query string — a CDN URL like
 * `…/hqdefault.jpg?v=2` is still a JPEG, and testing the whole href would miss
 * every signed URL. Nothing here fetches, so an image served without an
 * extension is not detected; that is the acceptable half of the trade, since
 * guessing wrong the other way would turn an ordinary page into a broken
 * `<img>`. The `<img>` itself confirms or refutes the guess by loading, which
 * is why guessing at all is safe.
 */
export function isImageUrl(url: string): boolean {
  const parsed = parse(url);
  return parsed ? IMAGE_EXTENSIONS.test(parsed.pathname) : false;
}

/** Whether a URL is one the `[video](…)` convention makes sense for. */
export function isVideoUrl(url: string): boolean {
  const parsed = parse(url);
  if (!parsed) return false;
  return (
    VIDEO_HOSTS.has(parsed.hostname.toLowerCase()) ||
    VIDEO_EXTENSIONS.test(parsed.pathname)
  );
}

/**
 * A YouTube video id, or `null`.
 *
 * Covers the three shapes people actually paste: `watch?v=`, the `youtu.be`
 * short link, and `/embed/…` or `/shorts/…` paths. Returned so a player can be
 * built without a round trip to oEmbed — the id is the only part of the URL an
 * embed needs, and rebuilding from a canonical form avoids carrying a playlist
 * or a timestamp into the iframe.
 */
export function youTubeId(url: string): string | null {
  const parsed = parse(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return id || null;
  }

  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "youtube-nocookie.com"
  ) {
    return null;
  }

  const v = parsed.searchParams.get("v");
  if (v) return v;

  const match = /^\/(?:embed|shorts|v)\/([^/?#]+)/.exec(parsed.pathname);
  return match ? match[1] : null;
}

/** What a paste should offer to become. */
export function linkKind(url: string): LinkKind {
  if (isImageUrl(url)) return "image";
  if (isVideoUrl(url)) return "video";
  return "link";
}

/** Bare host for display, e.g. "youtube.com". Null for anything unparseable. */
export function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Blocks `javascript:` and friends before a URL reaches the document.
 *
 * Used by every command that takes a URL from a human. Tiptap's Link extension
 * validates hrefs given to `setLink`, but the video command writes the mark
 * directly through `insertContent` and bypasses that — and these bodies are
 * rendered on public pages, so a bad scheme here travels a long way.
 *
 * A bare "example.com" is what people actually type, so https is assumed rather
 * than letting the URL parser reject it.
 */
export function safeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const { protocol } = new URL(candidate);
    if (!["http:", "https:", "mailto:"].includes(protocol)) return null;
    return candidate;
  } catch {
    return null;
  }
}
