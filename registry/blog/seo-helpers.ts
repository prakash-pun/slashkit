import { excerptFrom } from "@/lib/slashkit/strip-markdown";

/**
 * Share-card metadata and structured data for a post.
 *
 * Framework-agnostic SHAPES, not framework calls: spread the first into Next's
 * `generateMetadata` return value, or map it to whatever your framework wants;
 * serialise the second into a `<script type="application/ld+json">`.
 *
 * ── The rule that governs `buildBlogJsonLd` ────────────────────────────────
 * Every fact in structured data must ALSO be visible on the page. Data that
 * describes content a visitor cannot see is spam by Google's definition, and
 * the penalties are manual and slow to lift. So build these from the same
 * values the page renders from — never a second, hand-written copy that can
 * drift. Notably: do not invent an `aggregateRating`, which is the single most
 * common way this markup earns a penalty.
 */
export interface BlogPostSeoInput {
  title: string;
  /** Markdown. Only used when `excerpt` is absent. */
  body: string;
  /** The author's own summary. Always wins over a derived one. */
  excerpt?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
  /** ISO instant. Null until the post first goes live. */
  publishedAt?: string | null;
  updatedAt?: string | null;
  /** Absolute canonical URL for this post. */
  url: string;
  /** Publisher name for JSON-LD. Omit and no publisher is claimed. */
  siteName?: string | null;
  /** Absolute URL of the publisher logo, for JSON-LD. */
  siteLogoUrl?: string | null;
}

/**
 * A post's description for meta tags and structured data.
 *
 * The author's own excerpt wins when there is one; otherwise it is derived
 * through `stripMarkdown`, so an image URL or a `description|ios` alt tag can
 * never reach a search result.
 */
export function postDescription(post: BlogPostSeoInput, max = 160): string {
  const explicit = post.excerpt?.trim();
  if (explicit) return explicit;
  return excerptFrom(post.body, max);
}

/**
 * Open Graph and Twitter Card metadata.
 *
 * ── Why images are omitted rather than emptied ─────────────────────────────
 * An empty array SUPPRESSES the image; leaving the field undefined lets a
 * section-level fallback (Next's `opengraph-image` route, say) fill in. So a
 * coverless post still shares with a card rather than a bare link.
 *
 * ── A note on `title` ──────────────────────────────────────────────────────
 * This returns the bare title. If your framework applies a title TEMPLATE
 * (`%s — My Site`), a suffix here is appended to it, not instead of it — you
 * get "Five ways to budget — My Blog — My Site". The `openGraph.title` below is
 * separate and takes no template, which is where site wording belongs.
 */
export function buildBlogSeoMetadata(post: BlogPostSeoInput) {
  const description = postDescription(post);

  return {
    title: post.title,
    description,
    canonical: post.url,
    openGraph: {
      title: post.siteName ? `${post.title} — ${post.siteName}` : post.title,
      description,
      url: post.url,
      type: "article" as const,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

/**
 * `BlogPosting` structured data.
 *
 * Every optional field is spread in conditionally rather than set to a null or
 * an empty value: an empty `image: []` is a CLAIM that the post has no image,
 * which is the same information but noisier and occasionally wrong.
 */
export function buildBlogJsonLd(post: BlogPostSeoInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: postDescription(post, 200),
    // An array, which is the shape Google's own examples use — it accepts
    // several aspect ratios of the same image.
    ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    // Falls back to the publish date rather than being omitted — "never
    // modified" is true of a fresh post and is better than saying nothing.
    ...(post.updatedAt || post.publishedAt
      ? { dateModified: post.updatedAt ?? post.publishedAt }
      : {}),
    ...(post.authorName
      ? { author: { "@type": "Person", name: post.authorName } }
      : {}),
    ...(post.siteName
      ? {
          publisher: {
            "@type": "Organization",
            name: post.siteName,
            ...(post.siteLogoUrl
              ? { logo: { "@type": "ImageObject", url: post.siteLogoUrl } }
              : {}),
          },
        }
      : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": post.url },
    url: post.url,
  };
}

/**
 * JSON-LD as a string ready for `dangerouslySetInnerHTML`.
 *
 * `<` is escaped because a literal `</script>` anywhere in the data would close
 * the tag early and spill the rest into the document as markup. Everything you
 * pass is probably authored in-repo today — the escape is what keeps that from
 * mattering when a value starts coming from somewhere else.
 *
 *     <script
 *       type="application/ld+json"
 *       dangerouslySetInnerHTML={{ __html: jsonLdScript(buildBlogJsonLd(post)) }}
 *     />
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * A category's URL segment.
 *
 * `category` is free text — "Personal Finance", "Product Updates" — and those
 * cannot go into a path as-is without percent-encoded spaces and capitals,
 * which read badly and index worse. So the URL carries a slug and the stored
 * name is resolved back from it with `findCategoryBySlug`.
 */
export const categorySlug = (category: string) =>
  category
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Every category in use, in first-seen order, with its URL segment. */
export function blogCategories(
  posts: { category?: string | null }[],
): { name: string; slug: string }[] {
  const seen = new Map<string, string>();
  for (const post of posts) {
    const name = post.category?.trim();
    if (name && !seen.has(categorySlug(name))) {
      seen.set(categorySlug(name), name);
    }
  }
  return [...seen].map(([slug, name]) => ({ name, slug }));
}

/**
 * The stored category name behind a URL segment, or `null`.
 *
 * This round trip is what keeps category pages from 404ing: the link is built
 * from a slug, your API almost certainly filters on the exact NAME, and only
 * the post list knows how to get from one to the other.
 */
export function findCategoryBySlug(
  posts: { category?: string | null }[],
  slug: string,
): string | null {
  return blogCategories(posts).find((c) => c.slug === slug)?.name ?? null;
}
