import type { ComponentProps, ReactNode } from "react";

import { ContentMarkdownRenderer } from "@/components/slashkit/content-markdown-renderer";
import {
  DEFAULT_HIGHLIGHT_TYPE,
  displayEmoji,
  styleForType,
} from "@/lib/slashkit/highlight-style";
import type { PreviewMap } from "@/lib/slashkit/link-preview";
import { cn } from "@/lib/utils";

/**
 * The public renderer for changelog highlights.
 *
 * Import this on BOTH the public page and any admin preview, on purpose: a
 * preview is only worth having if it is the same code that ships, otherwise it
 * drifts and starts lying about what a release looks like. Nothing in here may
 * depend on being inside an admin route or on a public page.
 *
 * No `"use client"`, deliberately. There are no hooks or handlers here, so it
 * renders on the server for a public page — which then ships none of
 * react-markdown to the browser — while still bundling normally into an admin's
 * client tree. Adding the directive would push that parser into every visitor's
 * download for a page that is fully static.
 *
 * The layout is the in-app "What's New" sheet: emoji in a tinted rounded square
 * on the left, bold title and short description stacked to the right, generous
 * vertical spacing, no card borders or chrome around each item.
 */

/** What the renderer needs. Narrower than a full row, so drafts fit too. */
export interface RenderableHighlight {
  title: string;
  /** Markdown. The same subset the editor writes. */
  body: string;
  /** A free string — see `styleForType` for why an unknown one still renders. */
  type: string;
  icon?: string | null;
  iconType?: string | null;
}

/** Kept for callers that only ever produce emoji icons. */
export type Highlight = RenderableHighlight;

/**
 * The tinted square to the left of each highlight.
 *
 * `aria-hidden` because it is decoration: the type is already conveyed by the
 * title and body, and a screen reader announcing "sparkles" before every
 * feature is noise.
 */
function HighlightIcon({
  icon,
  iconType,
  type,
}: {
  icon?: string | null;
  iconType?: string | null;
  type: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl text-xl leading-none",
        styleForType(type).square,
      )}
    >
      {displayEmoji(icon, iconType, type)}
    </div>
  );
}

/** One highlight row. Exported so a caller can compose its own arrangement. */
export function WhatsNewItem({
  highlight,
  previews,
}: {
  highlight: RenderableHighlight;
  previews?: PreviewMap;
}) {
  return (
    <li className="flex gap-4">
      <HighlightIcon
        icon={highlight.icon}
        iconType={highlight.iconType}
        type={highlight.type ?? DEFAULT_HIGHLIGHT_TYPE}
      />
      <div className="min-w-0 flex-1 pt-1">
        <h3 className="font-medium text-foreground">{highlight.title}</h3>
        {highlight.body.trim() && (
          <ContentMarkdownRenderer
            body={highlight.body}
            previews={previews}
            // Terser than an article: these are one-line release notes skimmed
            // in a list, not a page someone reads top to bottom.
            className={cn(
              "mt-1 text-sm [&>*+*]:mt-2",
              "[&_h2]:text-sm [&_h3]:text-sm",
              "[&_li]:my-0.5",
            )}
          />
        )}
      </div>
    </li>
  );
}

/**
 * The highlights of a single release.
 *
 * Renders in the given order — whatever produced this array already decided it
 * (document order in the editor, `sortOrder` from an API), so re-sorting here
 * would fight whichever one is right.
 */
export function WhatsNewList({
  highlights,
  previews,
  className,
  ...props
}: {
  highlights: RenderableHighlight[];
  /**
   * Link metadata keyed by href, resolved by the CALLER. Passed in rather than
   * loaded here so a public page can resolve it server-side and bake the cards
   * into static HTML — no client request, no spinner, no layout shift. Omitting
   * it is fine; every card degrades to its plain form.
   */
  previews?: PreviewMap;
} & Omit<ComponentProps<"ul">, "children">) {
  return (
    <ul className={cn("space-y-6", className)} {...props}>
      {highlights.map((highlight, i) => (
        <WhatsNewItem key={i} highlight={highlight} previews={previews} />
      ))}
    </ul>
  );
}

/**
 * A release: version heading, date, then its highlights.
 *
 * The heading is a SLOT rather than fixed copy because callers name the same
 * release differently — an authoring preview says "What's New in v1.4.0" while
 * a public page under a page title that already supplies the context just says
 * "Version 1.4.0".
 */
export function WhatsNewRelease({
  heading,
  meta,
  highlights,
  previews,
  className,
}: {
  heading: ReactNode;
  meta?: ReactNode;
  highlights: RenderableHighlight[];
  previews?: PreviewMap;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      <WhatsNewList highlights={highlights} previews={previews} />
    </section>
  );
}
