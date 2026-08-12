import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A help library's index, bucketed under category headings.
 *
 * Flat and categorised rather than the changelog's release grouping: an article
 * is current or it is edited — there are no versions to preserve.
 *
 * `renderLink` is the whole framework-agnosticism story. This component knows
 * an article has a slug; it does not know whether you link with `next/link`, a
 * router `<Link>`, or a bare `<a>`, so it hands you the article and renders
 * whatever you return.
 */
export interface HelpArticleSummary {
  slug: string;
  title: string;
  /** Free string, not an enum — see `groupByCategory`. */
  category: string;
  /** Shown before the title when set. Emoji only; see `displayEmoji`. */
  icon?: string | null;
  iconType?: string | null;
}

export interface HelpArticleListProps<T extends HelpArticleSummary> {
  articles: T[];
  renderLink: (article: T) => ReactNode;
  /** Heading for articles whose category is blank. */
  fallbackCategory?: string;
  className?: string;
}

export function HelpArticleList<T extends HelpArticleSummary>({
  articles,
  renderLink,
  fallbackCategory = "Other",
  className,
}: HelpArticleListProps<T>) {
  const groups = groupByCategory(articles, fallbackCategory);

  return (
    <div className={cn("space-y-8", className)}>
      {groups.map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            {category}
          </h2>
          <div className="space-y-1">
            {items.map((article) => (
              <div key={article.slug}>{renderLink(article)}</div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Articles bucketed under their category heading.
 *
 * ── Why a Map and not a plain object ───────────────────────────────────────
 * So the categories come out in the order they arrived. Object key order
 * reorders anything that looks like an integer, and `category` is a free
 * string — one named "2026" would jump to the top of the page for no reason a
 * reader could see.
 *
 * An uncategorised article falls back rather than being dropped: it is still a
 * page someone needs to be able to reach.
 *
 * Exported so an admin sidebar can group by the exact same rule the public page
 * does — two implementations of "which category is this in" eventually
 * disagree.
 */
export function groupByCategory<T extends HelpArticleSummary>(
  articles: T[],
  fallbackCategory = "Other",
): [string, T[]][] {
  const groups = new Map<string, T[]>();

  for (const article of articles) {
    const category = article.category?.trim() || fallbackCategory;
    const existing = groups.get(category);
    if (existing) existing.push(article);
    else groups.set(category, [article]);
  }

  return [...groups];
}
