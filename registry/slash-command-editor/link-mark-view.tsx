"use client";

import { useEffect, useRef, useState } from "react";
import { MarkViewContent, type MarkViewProps } from "@tiptap/react";
import { ExternalLink, Globe, Play } from "lucide-react";

import { useBrokenImage } from "@/hooks/use-broken-image";
import { isImageUrl } from "@/lib/slashkit/link-kind";
import {
  loadPreview,
  peekPreview,
  type LinkPreview,
} from "@/lib/slashkit/link-preview";
import { VIDEO_LINK_TEXT } from "@/lib/slashkit/commands";
import { cn } from "@/lib/utils";

/**
 * A link inside the editor, drawn the way it will ship.
 *
 * This exists because of the kit's central promise: the editor IS the preview.
 * Once whole-line links became cards on the published page, leaving them as
 * underlined text here would quietly reintroduce the gap that promise removes —
 * you would be authoring one thing and shipping another.
 *
 * Metadata comes from `loadPreview`, which resolves through whatever you gave
 * `configureLinkPreviews`. Register nothing and every link simply stays a plain
 * underlined link — this component makes no request of its own.
 *
 * ── Why an inline-block card rather than a real block card ─────────────────
 * This is a MARK view, and marks wrap inline content — ProseMirror will not let
 * one become a block element without corrupting the document's inline layout.
 * An `inline-block` card in a paragraph containing nothing else fills the line
 * and reads as a block card, close enough that the two surfaces match, while
 * the underlying document stays a plain link with a link mark. That last part
 * matters: the body still has to serialise back to `[video](…)`, and anything
 * that made this a custom NODE would break that round trip.
 */
export function LinkMarkView({ mark }: MarkViewProps) {
  const href = (mark.attrs.href as string | undefined) ?? "";

  const [preview, setPreview] = useState<LinkPreview | null>(() =>
    peekPreview(href),
  );
  const {
    failed: thumbFailed,
    ref: thumbRef,
    onError: onThumbError,
  } = useBrokenImage();

  /**
   * The link's visible text, read from the DOM.
   *
   * A mark view is handed `mark`, `view`, `editor` and `extension` — but NOT
   * the node it wraps, so there is no direct way to ask what text this mark
   * covers. Observing the content element is the reliable route, and it has to
   * be an observer rather than a one-off read because the text is editable:
   * typing "video" into an existing link has to flip it to a video card.
   */
  const contentRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState("");
  const [lone, setLone] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const block =
      element.closest("p, h2, h3, li") ?? element.parentElement ?? element;

    const read = () => {
      setLabel(element.textContent?.trim() ?? "");

      // "Is this link alone on its line?" is decided STRUCTURALLY — the block's
      // only meaningful child node is the one wrapping this mark — never by
      // comparing text. A text comparison feeds back on itself: rendering the
      // card injects a title and a site name into the block, the block's
      // textContent stops matching the label, the card unrenders, and it
      // oscillates. Child nodes don't move when this component redraws inside
      // its own root.
      const meaningful = [...block.childNodes].filter(
        (node) =>
          !(node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
      );
      setLone(
        meaningful.length === 1 &&
          meaningful[0].nodeType === Node.ELEMENT_NODE &&
          (meaningful[0] as Element).contains(rootRef.current),
      );
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(block, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!href) return;
    let active = true;
    void loadPreview(href).then((result) => {
      if (active) setPreview(result);
    });
    return () => {
      active = false;
    };
  }, [href]);

  // Video-ness comes from the LABEL, exactly as on the published page — never
  // from the URL. Deciding it differently here is precisely the drift this
  // component exists to prevent.
  const isVideo = label.toLowerCase() === VIDEO_LINK_TEXT;
  const ok = preview?.fetchStatus === "success";
  const title = ok ? preview?.title : null;
  const site = ok ? preview?.siteName : null;

  // The thumbnail is not video-only. An ordinary link with an `og:image` used
  // to render as a globe and a hostname while the metadata for a real preview
  // sat unused in the very same response — the card looked broken beside the
  // video ones for no reason a reader could see. A video still gets the play
  // badge on top; the difference between the two is that badge, not whether
  // there is a picture.
  //
  // A link pointing AT an image is drawn as that image, matching what the
  // renderer does with the same shape.
  const asImage = lone && isImageUrl(href) && !thumbFailed;
  const showThumb =
    !asImage && lone && Boolean(ok && preview?.imageUrl) && !thumbFailed;
  // A card needs BOTH something to show and a line to itself. An inline link
  // mid-sentence stays inline — swapping it for a card would tear the sentence
  // in half, and the renderer draws it inline for exactly that reason. This is
  // also the state while a URL is still being typed, so it must not flicker or
  // reserve space it might not keep.
  const card = lone && (asImage || showThumb || Boolean(title));

  return (
    <span
      ref={rootRef}
      className={cn(
        card
          ? "my-1 inline-block max-w-md overflow-hidden rounded-xl border border-border/60 align-top no-underline"
          : "contents",
      )}
    >
      {asImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={thumbRef}
          src={href}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          // Falls back to the ordinary card if the URL turns out not to serve an
          // image after all — an extension is a guess, not a guarantee.
          onError={onThumbError}
          className="block w-full bg-muted object-contain"
        />
      )}

      {showThumb && (
        <span className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={thumbRef}
            src={preview!.imageUrl!}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={onThumbError}
            className="block aspect-video w-full bg-muted object-cover"
          />
          {/* The badge is what says "video" at a glance — a bare thumbnail
              reads as an ordinary preview, which is the one thing it must not
              be confused with now that ordinary previews have thumbnails too. */}
          {isVideo && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                <Play className="ml-0.5 size-5 fill-current" />
              </span>
            </span>
          )}
        </span>
      )}

      {/* `display: contents` in the plain state keeps this wrapper chain in the
          DOM at a STABLE depth. MarkViewContent must never change parents —
          ProseMirror holds a ref to the element it renders into, and swapping
          between two different trees would hand it a detached node and drop the
          text this mark is attached to. */}
      <span
        className={cn(card ? "flex items-center gap-2.5 px-3 py-2" : "contents")}
      >
        {card && isVideo && !showThumb && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-3 fill-current" />
          </span>
        )}
        {card && !isVideo && (
          <Globe className="size-4 shrink-0 text-muted-foreground" />
        )}

        <span className={cn(card ? "min-w-0 flex-1" : "contents")}>
          {/* The editable text — rendered exactly once, always here. For a
              normal link this IS the card's heading, because the label is
              content someone is editing and hiding it would make the card
              impossible to type into. */}
          <span
            ref={contentRef}
            className={cn(
              card &&
                "block truncate text-sm font-medium text-foreground no-underline",
              !card && "text-primary underline underline-offset-2",
              // "video" is a convention, not a label meant to be read — the
              // resolved title below says what it actually is. Still rendered,
              // just not shown, so the text stays editable.
              card && isVideo && "sr-only",
            )}
          >
            <MarkViewContent as="span" />
          </span>

          {card && isVideo && (
            <span className="block truncate text-sm font-medium text-foreground">
              {title ?? "Watch video"}
            </span>
          )}

          {card && (
            <span className="block truncate text-xs text-muted-foreground">
              {[preview?.author, site].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>

        {card && !isVideo && (
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </span>
    </span>
  );
}
