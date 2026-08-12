import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  LinkPreviewCard,
  VideoLinkCard,
} from "@/components/slashkit/video-link-card";
import { YouTubeEmbed } from "@/components/slashkit/youtube-embed";
import { isImageUrl, youTubeId } from "@/lib/slashkit/link-kind";
import { headingId } from "@/lib/slashkit/markdown-headings";
import {
  loneImageOf,
  loneLinkOf,
  textOf,
  type MdastNode,
} from "@/lib/slashkit/markdown-nodes";
import type { PreviewMap } from "@/lib/slashkit/link-preview";
import {
  DEFAULT_PLATFORM_TAGS,
  isHiddenOnPlatform,
  parsePlatformAlt,
} from "@/lib/slashkit/parse-platform-alt";
import { cn } from "@/lib/utils";

/**
 * The one renderer for everything the Slashkit editor writes.
 *
 * Deliberately shared by public pages AND any authoring preview: a preview is
 * only worth having if it is the same code that ships, otherwise it drifts and
 * starts lying about what the content looks like.
 *
 * No `"use client"`, deliberately. There are no hooks or handlers here, so on a
 * server-rendering framework it renders on the server and the page ships none
 * of react-markdown to the browser. It still bundles normally into a client
 * tree when an editor imports it. (`VideoLinkCard` and `YouTubeEmbed` carry
 * their own `"use client"` — they need it, this does not.)
 *
 * ── The conventions it draws ───────────────────────────────────────────────
 *   `[video](url)` alone on a line   → an inline player, or a link-out card
 *   a link alone on a line           → a rich preview card, given metadata
 *   a link pointing AT an image      → that image
 *   `![desc|ios](url)`               → shown only when `ios` is selected
 *   `## heading`                     → gets a stable anchor id
 */
export interface ContentMarkdownRendererProps {
  body: string;
  /**
   * Which platform's images to show. Leave undefined to show every image
   * regardless of tag, which is what a surface with no toggle wants.
   */
  activePlatform?: string;
  /** The tags `activePlatform` is drawn from. See `parse-platform-alt.ts`. */
  platformTags?: readonly string[];
  /**
   * Link metadata keyed by href, resolved by the CALLER.
   *
   * Passed in rather than loaded here so a page can resolve it server-side and
   * bake the cards into static HTML — no client request, no spinner, no cards
   * popping in after paint. Omitting it is supported and simply leaves every
   * lone link as a plain link.
   */
  previews?: PreviewMap;
  /**
   * Render checklists, and style blockquotes and dividers.
   *
   * Off by default, and that default is the interesting half. Turning it on
   * loads `remark-gfm`, whose task-list support is the only way `- [ ] item`
   * becomes a checkbox rather than the literal text "[ ]". Leave it off on any
   * surface whose bodies are ALSO parsed by something else — a mobile client, a
   * feed reader, another renderer — because a construct that draws here and not
   * there is worse than one that draws nowhere: nobody finds out until it has
   * shipped.
   *
   * Mirrors `markdownExtensions`' flag of the same name: the editor that can
   * PRODUCE these blocks and the renderer that can DRAW them get switched on
   * together, or an author writes something that silently disappears.
   */
  richBlocks?: boolean;
  /** Replace the built-in `[video](…)` treatment entirely. */
  renderVideoLink?: (href: string) => ReactNode;
  className?: string;
}

export function ContentMarkdownRenderer({
  body,
  activePlatform,
  platformTags = DEFAULT_PLATFORM_TAGS,
  previews,
  richBlocks = false,
  renderVideoLink,
  className,
}: ContentMarkdownRendererProps) {
  /** Whether platform filtering is active at all. */
  const filtering = Boolean(activePlatform);

  return (
    <div
      className={cn(
        "text-[15px] leading-relaxed break-words text-muted-foreground",
        "[&>*]:my-0 [&>*+*]:mt-4",
        "[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic",
        "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_*+h2]:mt-8",
        "[&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_*+h3]:mt-6",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
        // A quote reads as a quote by its rule and its weight, not by italics
        // or quotation marks — those fight with the bold and links inside it.
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4",
        "[&_blockquote]:text-foreground [&_blockquote_p]:my-2",
        // A divider is a section break, so it gets the space of one rather than
        // sitting tight against the paragraphs on either side.
        "[&_hr]:my-8 [&_hr]:border-border",
        // GFM renders a task list as <li class="task-list-item"> whose first
        // paragraph starts with a disabled checkbox. The marker has to go or
        // every row shows a bullet AND a box.
        //
        // Hooked on GFM's own class rather than `li:has(> input)`, which matches
        // nothing: the checkbox is nested inside the item's <p>, not a direct
        // child of the <li>. And scoped to the ITEM, never the list — a
        // checklist followed by a bullet list comes out of the editor as one run
        // of `-` lines separated by blank lines, which remark parses as a single
        // loose <ul>, so a `ul:has(input)` rule would strip the discs off the
        // plain bullets sharing it. Per-item, a mixed list renders right.
        "[&_li.task-list-item]:list-none [&_li.task-list-item>p]:my-0",
        "[&_input[type=checkbox]]:mr-1 [&_input[type=checkbox]]:size-3.5",
        "[&_input[type=checkbox]]:translate-y-px [&_input[type=checkbox]]:accent-primary",
        // Links and images are styled on the ELEMENTS below rather than with
        // `[&_a]` / `[&_img]` descendant selectors, which would also hit the
        // anchor and thumbnail inside a card — and a card cannot opt out,
        // because a descendant selector outranks a utility class on the child.
        className,
      )}
    >
      <ReactMarkdown
        // Only when asked for — see the `richBlocks` note above for why this is
        // not simply always on.
        remarkPlugins={richBlocks ? [remarkGfm] : []}
        components={{
          p: ({ node, children }) => {
            // An image tagged for another platform takes its paragraph with it.
            // Dropping only the <img> would leave an empty <p> holding a block
            // gap open where a screenshot used to be, which reads as a failed
            // image rather than an omitted one.
            const loneImage = loneImageOf(node);
            if (
              loneImage &&
              filtering &&
              isHiddenOnPlatform(loneImage.alt, activePlatform!, platformTags)
            ) {
              return null;
            }

            const lone = loneLinkOf(node);
            if (!lone) return <p>{children}</p>;

            // A link that points AT an image, alone on its line, is a picture.
            //
            // Not hypothetical: pasting an image URL produces exactly this shape
            // — a link whose text is its own href — so an image pasted before
            // the paste chooser existed sits in the body as a link, and would
            // otherwise render as a card with a hostname on it. Scoped to lone
            // links so a deliberate "see this diagram" link inside a sentence
            // stays a link.
            if (isImageUrl(lone.href)) {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lone.href}
                  // The label is the URL in the pasted case, which is not a
                  // description of anything. Only text an author actually wrote
                  // becomes alt.
                  alt={lone.label === lone.href ? "" : lone.label}
                  loading="lazy"
                  className="w-full rounded-xl border border-border/60"
                />
              );
            }

            const preview = previews?.[lone.href];

            // Video vs ordinary link is decided by the LABEL, never by
            // inspecting the URL. Sniffing for youtube.com would misclassify a
            // link that points at a video host for a non-video reason, and
            // gives the author no way to opt out of the heuristic.
            if (lone.label.toLowerCase() === "video") {
              if (renderVideoLink) return <>{renderVideoLink(lone.href)}</>;

              // A YouTube video plays where it sits instead of sending the
              // reader away and losing them. Everything else — Loom, Vimeo, a
              // bare .mp4 — keeps the card that links out, because there is no
              // facade to show for it.
              const id = youTubeId(lone.href);
              if (id) {
                return (
                  <YouTubeEmbed
                    videoId={id}
                    title={preview?.title}
                    thumbnailUrl={preview?.imageUrl}
                  />
                );
              }

              return <VideoLinkCard href={lone.href} preview={preview} />;
            }

            // A link alone on its line becomes a rich card — but ONLY when the
            // caller resolved metadata for it. Without a preview there is
            // nothing to show beyond the hostname, and a card that is only a
            // hostname is worse than the link it replaced, so it stays a
            // paragraph.
            if (preview) {
              return (
                <LinkPreviewCard
                  href={lone.href}
                  preview={preview}
                  label={lone.label}
                />
              );
            }

            return <p>{children}</p>;
          },
          // Stable ids on every heading, so a table of contents can link to one
          // and any section is directly shareable. Derived through the same
          // `headingId` the ToC uses — two different slug rules would produce
          // links that go nowhere.
          h2: ({ node, children }) => (
            <h2 id={headingId(textOf(node as MdastNode))}>{children}</h2>
          ),
          h3: ({ node, children }) => (
            <h3 id={headingId(textOf(node as MdastNode))}>{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            // The alt text carries the platform signal. Symmetric — whichever
            // platform is NOT selected is the one that gets skipped — and an
            // untagged image is universal, so it always renders.
            const { tag, displayAlt } = parsePlatformAlt(alt, platformTags);
            if (typeof src !== "string") return null;
            if (filtering && tag && tag !== activePlatform) return null;

            // Plain <img> rather than a framework image component: these are
            // absolute URLs on whatever blob store you upload to, which
            // `next/image` would need configured as a remote pattern per
            // environment. Swap it if that trade goes the other way for you.
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                // The DESCRIPTION, never the raw alt — the platform tag is
                // routing information, and a screen reader announcing "ios"
                // over a screenshot is worse than announcing nothing. An
                // untagged image's description is just its alt unchanged.
                alt={displayAlt}
                loading="lazy"
                className="w-full rounded-xl border border-border/60"
              />
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
