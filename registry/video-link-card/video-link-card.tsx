"use client";

import { ExternalLink, Globe, Play } from "lucide-react";

import { useBrokenImage } from "@/hooks/use-broken-image";
import { hostnameOf } from "@/lib/slashkit/link-kind";
import { cn } from "@/lib/utils";
import type { LinkPreview } from "@/lib/slashkit/link-preview";

/**
 * Rich cards for whole-line links.
 *
 * Metadata is passed IN as a prop, never fetched here — see `link-preview.ts`
 * for why that seam is where it is. So these components never load anything and
 * never show a spinner; `preview` is either there or it isn't, and "isn't" is a
 * supported state.
 *
 * Every field is optional even on a successful fetch (plenty of pages publish
 * no `og:` tags), so each part is independently conditional and the card
 * degrades — image, then title, then site — down to the plain treatment. A card
 * with only a favicon and a hostname still beats a bare URL; a card with
 * nothing at all is worse than the link it replaced, so it isn't one.
 */

const usable = (preview?: LinkPreview | null) =>
  preview?.fetchStatus === "success" &&
  Boolean(preview.title ?? preview.imageUrl ?? preview.siteName);

/** Favicon with a lucide fallback, dropping itself out if the file won't load. */
function Favicon({
  preview,
  className,
}: {
  preview?: LinkPreview | null;
  className?: string;
}) {
  const {
    failed: faviconFailed,
    ref: faviconRef,
    onError: onFaviconError,
  } = useBrokenImage();

  if (!preview?.faviconUrl || faviconFailed) {
    return <Globe className={cn("text-muted-foreground", className)} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={faviconRef}
      src={preview.faviconUrl}
      alt=""
      loading="lazy"
      // No reason to tell someone else's CDN where the view came from, and some
      // of them reject hotlinks by referer.
      referrerPolicy="no-referrer"
      onError={onFaviconError}
      className={cn("shrink-0 rounded-sm object-contain", className)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A `[video](…)` link.
 *
 * Whether something is a video is decided by the TEXT convention — a link whose
 * visible text is exactly "video" — never by sniffing the URL. So this renders
 * for a direct .mp4 just as much as for YouTube, and an author who does not
 * want the treatment simply writes a different label. `preview` only affects
 * how much there is to show: a link with oEmbed metadata gets a real thumbnail
 * and title, anything else falls back to the label-only card.
 *
 * This never embeds a player. `YouTubeEmbed` is the component that does, and
 * `ContentMarkdownRenderer` picks between them.
 */
export function VideoLinkCard({
  href,
  preview,
  className,
}: {
  href: string;
  preview?: LinkPreview | null;
  className?: string;
}) {
  const {
    failed: thumbFailed,
    ref: thumbRef,
    onError: onThumbError,
  } = useBrokenImage();

  const host = hostnameOf(href);
  const showThumb = usable(preview) && preview?.imageUrl && !thumbFailed;
  const title = usable(preview) ? preview?.title : null;

  // Nothing came back — the label-only card.
  if (!showThumb && !title) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "mt-2 flex w-fit items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2",
          "text-sm no-underline transition-colors hover:border-border hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3 fill-current" />
        </span>
        <span className="font-medium text-foreground">Watch video</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group mt-3 block w-full max-w-md overflow-hidden rounded-xl border border-border/60",
        "no-underline transition-colors hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {showThumb && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={thumbRef}
            src={preview!.imageUrl!}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={onThumbError}
            className="aspect-video w-full bg-muted object-cover"
          />
          {/* The play badge is what says "video" at a glance — a bare thumbnail
              reads as an ordinary image, which is the one thing this card must
              not be confused with. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full bg-black/55 text-white",
                "backdrop-blur-sm transition-transform group-hover:scale-105",
              )}
            >
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {!showThumb && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-3 fill-current" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {title ?? "Watch video"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[preview?.author, preview?.siteName ?? host]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC LINK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A whole-line link that isn't a video.
 *
 * Only applied when the link is alone in its paragraph — an inline link inside
 * a sentence stays an inline link, because replacing it with a block card would
 * tear the sentence in half.
 */
export function LinkPreviewCard({
  href,
  preview,
  label,
  className,
}: {
  href: string;
  preview?: LinkPreview | null;
  /** The authored link text, used when the page published no title. */
  label?: string;
  className?: string;
}) {
  const {
    failed: imageFailed,
    ref: imageRef,
    onError: onImageError,
  } = useBrokenImage();

  const host = hostnameOf(href);
  const site = usable(preview) ? (preview?.siteName ?? host) : host;
  const heading = (usable(preview) ? preview?.title : null) ?? label ?? site;
  const showImage = usable(preview) && preview?.imageUrl && !imageFailed;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group mt-3 block w-full max-w-md overflow-hidden rounded-xl border border-border/60",
        "no-underline transition-colors hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={preview!.imageUrl!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={onImageError}
          className="h-36 w-full border-b border-border/60 bg-muted object-cover"
        />
      )}

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Favicon preview={preview} className="size-4" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {heading}
          </p>
          {/* Only worth a second line when it isn't repeating the first. */}
          {site && site !== heading && (
            <p className="truncate text-xs text-muted-foreground">{site}</p>
          )}
        </div>

        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </a>
  );
}
