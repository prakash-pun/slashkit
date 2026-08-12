"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A YouTube video that plays in place.
 *
 * ── Why a facade rather than an iframe on load ─────────────────────────────
 * Dropping YouTube's `<iframe>` into the page costs several hundred kilobytes
 * and a set of third-party cookies for every visitor, including the ones who
 * scroll past without watching — where the video is supporting material, that
 * is most of them. So the page ships a thumbnail and a play button, and the
 * real player is only created once someone asks for it by clicking.
 *
 * `youtube-nocookie.com` for the same reason, and `autoplay=1` because the
 * click that swapped it in WAS the request to play; making someone press play
 * twice is the classic tell of a facade done carelessly.
 *
 * The thumbnail comes from the caller (whose preview metadata had one) or falls
 * back to YouTube's own predictable image URL, so a video still looks like
 * something even when no metadata was resolved. That fallback is an `<img>` the
 * BROWSER loads, not a fetch this component makes.
 */
export function YouTubeEmbed({
  videoId,
  title,
  thumbnailUrl,
  className,
}: {
  videoId: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  const poster =
    thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const label = title ?? "Play video";

  return (
    <span
      className={cn(
        "relative my-4 block aspect-video w-full max-w-2xl overflow-hidden rounded-xl",
        "border border-border/60 bg-muted",
        className,
      )}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={label}
          // `allow` is what lets the player actually go fullscreen and start
          // itself; without `autoplay` in it the click above does nothing.
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={label}
          className="group absolute inset-0 size-full cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            loading="lazy"
            // YouTube serves thumbnails without a referrer requirement, and not
            // sending one keeps the visit off their logs until a play.
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />

          <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full bg-black/60 text-white",
                "backdrop-blur-sm transition-transform group-hover:scale-105",
              )}
            >
              <Play className="ml-1 size-6 fill-current" />
            </span>
          </span>

          {title && (
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 text-left">
              <span className="line-clamp-2 text-sm font-medium text-white">
                {title}
              </span>
            </span>
          )}
        </button>
      )}
    </span>
  );
}
