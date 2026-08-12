import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One post in a grid.
 *
 * ── Why the category link is not nested inside the card link ───────────────
 * The obvious markup puts the whole card in one `<a>` and the category in a
 * second `<a>` inside it. That is invalid HTML: an anchor cannot contain an
 * anchor, and browsers recover by CLOSING the outer one early, which silently
 * splits the card into two links and drops everything after the category out of
 * the clickable area. `stopPropagation` does not help — the damage is done by
 * the parser, before any handler runs.
 *
 * So the card link covers the card via an absolutely-positioned overlay
 * (`after:absolute after:inset-0`) and the category link sits ABOVE it in the
 * stacking order with `relative z-10`. One `<a>` in the markup, two
 * independently clickable regions, and the whole card is still a single tap
 * target on a phone.
 *
 * Both links are YOUR elements — `renderTitleLink` and `renderCategoryLink` —
 * so this works with `next/link`, a router `<Link>` or a bare `<a>`. Apply the
 * classes handed to you or the layout above stops working.
 */
export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  authorName?: string | null;
  /** ISO instant. Null until the post first goes live. */
  publishedAt?: string | null;
}

export interface BlogPostCardProps<T extends BlogPostSummary> {
  post: T;
  /**
   * The title link. MUST apply `className` — it carries the overlay that makes
   * the whole card clickable.
   */
  renderTitleLink: (props: {
    post: T;
    className: string;
    children: ReactNode;
  }) => ReactNode;
  /** The category link. Omit to render the category as plain text. */
  renderCategoryLink?: (props: {
    category: string;
    className: string;
    children: ReactNode;
  }) => ReactNode;
  /**
   * The cover image. Omit for a plain `<img>` — pass one to use `next/image` or
   * any other optimising component.
   */
  renderImage?: (props: {
    src: string;
    alt: string;
    className: string;
  }) => ReactNode;
  /** The category is redundant on a category page, where every post shares it. */
  showCategory?: boolean;
  formatDate?: (iso: string) => string;
  className?: string;
}

export function BlogPostCard<T extends BlogPostSummary>({
  post,
  renderTitleLink,
  renderCategoryLink,
  renderImage,
  showCategory = true,
  formatDate = (iso) => new Date(iso).toLocaleDateString(),
  className,
}: BlogPostCardProps<T>) {
  const category = post.category?.trim();
  const coverClassName =
    "mb-3 aspect-video w-full rounded-xl border border-border/60 bg-muted object-cover";

  return (
    <article className={cn("group relative flex flex-col", className)}>
      {post.coverImageUrl &&
        (renderImage ? (
          renderImage({
            src: post.coverImageUrl,
            // Descriptive, not empty. A blog exists to be discovered from
            // outside, and image search is a real traffic source — so the alt
            // earns its keep for both a screen reader and a crawler. The title
            // is the description here; a post whose cover needs to say
            // something different needs its own alt field.
            alt: post.title,
            className: coverClassName,
          })
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            loading="lazy"
            className={coverClassName}
          />
        ))}

      {showCategory &&
        category &&
        (renderCategoryLink ? (
          renderCategoryLink({
            category,
            // `relative z-10` lifts this above the card overlay below, so it
            // stays independently clickable without being nested inside the
            // card's link.
            className:
              "relative z-10 w-fit text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            children: category,
          })
        ) : (
          <span className="w-fit text-xs font-medium text-muted-foreground">
            {category}
          </span>
        ))}

      <h2 className="mt-1 font-medium text-foreground">
        {renderTitleLink({
          post,
          // The overlay that makes the whole card clickable. `after:` rather
          // than wrapping, for the anchor-nesting reason at the top.
          className:
            "after:absolute after:inset-0 after:content-[''] group-hover:text-muted-foreground",
          children: post.title,
        })}
      </h2>

      {post.excerpt && (
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
          {post.excerpt}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground/70">
        {post.authorName}
        {post.authorName && post.publishedAt && " · "}
        {post.publishedAt && (
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        )}
      </p>
    </article>
  );
}

/**
 * Drafts first, then published.
 *
 * Not chronological: someone opening an admin list is nearly always either
 * finishing a draft or checking what is live, and a draft buried three rows
 * into a date-ordered list serves neither. Within each group the input order is
 * kept — re-sorting here would be a second opinion to keep in step with.
 */
export function groupByStatus<T extends { status?: string | null }>(
  posts: T[],
): { drafts: T[]; published: T[] } {
  return {
    drafts: posts.filter((post) => !isPublished(post)),
    published: posts.filter(isPublished),
  };
}

/**
 * True once a post is public.
 *
 * Case-INSENSITIVE, and never a bare `===`. Status columns disagree about case
 * across systems more often than you would expect (`"published"` here,
 * `"PUBLISHED"` there), and a case mismatch would silently file every published
 * post under Drafts rather than failing loudly.
 */
export const isPublished = (post: { status?: string | null }) =>
  post.status?.toLowerCase() === "published";
