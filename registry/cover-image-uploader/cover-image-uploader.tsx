"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A page-level cover image.
 *
 * ── Deliberately NOT the `/image` slash command ────────────────────────────
 * A cover is a page-level PROPERTY — it appears in the post list, in social
 * share cards and in RSS, none of which read the body — so it has to live in a
 * field your API can return on its own, not as the first `![](…)` inside the
 * markdown. Making it body content would mean every consumer parsing the
 * document to find a picture, and an author reordering paragraphs would
 * silently change the share card.
 *
 * The upload goes through the same `onUploadImage` callback the in-body
 * commands use; only where the resulting URL is stored differs.
 *
 * Put it ABOVE the title in your form, because that is where it renders on the
 * published page — an editor should not imply an order the page does not have.
 */
export function CoverImageUploader({
  value,
  onChange,
  onUploadImage,
  className,
}: {
  value: string | null;
  /** `null` means the author removed the cover. */
  onChange: (url: string | null) => void;
  /** Resolve a public URL, or `null` for a cancel or a failure. */
  onUploadImage: () => Promise<string | null>;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    setUploading(true);
    try {
      const url = await onUploadImage();
      // A null here means "leave the current cover alone", NOT "clear it" —
      // clearing is the trash button, which is an explicit act.
      if (url) onChange(url);
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border/60",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt=""
          className="aspect-[2/1] w-full bg-muted object-cover"
        />

        {/* Always visible rather than hover-revealed — a touch screen never
            hovers, and a cover you cannot replace or remove on a phone is a
            cover you are stuck with. */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => void pick()}
            disabled={uploading}
            className={cn(
              "rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm",
              "transition-colors hover:bg-background disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : "Replace"}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove cover image"
            className={cn(
              "rounded-md bg-background/90 p-1.5 text-muted-foreground backdrop-blur-sm",
              "transition-colors hover:bg-background hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void pick()}
      disabled={uploading}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60",
        "py-6 text-sm text-muted-foreground transition-colors",
        "hover:border-border hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {uploading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Uploading…
        </>
      ) : (
        <>
          <ImagePlus className="size-4" />
          Add a cover image
        </>
      )}
    </button>
  );
}
