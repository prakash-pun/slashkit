import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

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
 * What raw HTML is allowed through, and nothing else.
 *
 * ── Why sanitizing is not optional ─────────────────────────────────────────
 * The editor writes two constructs that markdown cannot express — `<u>` for
 * underline and `<details>` for a collapsible section — so this renderer has to
 * run `rehype-raw` to draw them. `rehype-raw` on its own renders ANY html in
 * the body, including `<script>` and `onerror=`, which is a stored-XSS hole the
 * moment a body comes from anywhere less trusted than your own admin panel.
 *
 * So raw HTML is parsed and then filtered against this allowlist. It starts
 * from `defaultSchema` (a conservative, well-reviewed set) and adds exactly the
 * three things the editor can produce. Nothing else survives — a `<script>` in
 * a body is dropped rather than escaped, which is the correct outcome.
 *
 * Widen it only alongside an editor change that can actually produce the tag.
 */
const HTML_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary", "u"],
  attributes: {
    ...defaultSchema.attributes,
    // `open` is the only attribute worth carrying — it is how an author says a
    // section should start expanded.
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
  },
};

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
  /*
   * There is deliberately NO vocabulary flag here any more.
   *
   * This renderer draws everything the editor can write, plus a little it
   * cannot (tables, autolinks — GFM comes as one piece). The old `richBlocks`
   * prop existed to keep the two in step when quotes, dividers and task lists
   * were gated; now that only the EDITOR gates anything, a flag here would
   * either do nothing or make the renderer narrower than its author, which is
   * the direction that loses content.
   *
   * Removed rather than deprecated on purpose: a prop that is quietly ignored
   * is worse than one that fails to compile and sends you to this comment.
   */
  /** Replace the built-in `[video](…)` treatment entirely. */
  renderVideoLink?: (href: string) => ReactNode;
  className?: string;
}

export function ContentMarkdownRenderer({
  body,
  activePlatform,
  platformTags = DEFAULT_PLATFORM_TAGS,
  previews,
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
        "[&_s]:line-through [&_u]:underline [&_u]:underline-offset-2",
        "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_*+h2]:mt-8",
        "[&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_*+h3]:mt-6",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5",
        "[&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground",
        // ── Collapsible sections ───────────────────────────────────────────
        // A native <details>, so the open/close behaviour is the browser's and
        // costs no JavaScript — which is what keeps this renderer usable in a
        // server component.
        "[&_details]:my-4 [&_details]:overflow-hidden [&_details]:rounded-xl",
        "[&_details]:border [&_details]:border-border/60",
        "[&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:bg-muted/40",
        "[&_summary]:px-3 [&_summary]:py-2 [&_summary]:text-sm [&_summary]:font-medium",
        "[&_summary]:text-foreground [&_summary]:select-none",
        "[&_summary]:transition-colors hover:[&_summary]:bg-muted/70",
        // Safari draws its own triangle through `::-webkit-details-marker` and
        // ignores `list-style: none`, so it needs removing by name or every
        // summary shows two disclosure arrows.
        "[&_summary::-webkit-details-marker]:hidden",
        // The arrow, drawn on the summary itself and rotated when open.
        "[&_summary]:before:mr-2 [&_summary]:before:inline-block [&_summary]:before:content-['▸']",
        "[&_summary]:before:text-muted-foreground [&_summary]:before:transition-transform",
        "[&_details[open]_summary]:before:rotate-90",
        "[&_details[open]_summary]:border-b [&_details[open]_summary]:border-border/60",
        "[&_details>*:not(summary)]:px-3 [&_details>*:not(summary)]:first-of-type:mt-3",
        "[&_details>*:not(summary)]:last:mb-3",
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
        // GFM is now unconditional: `~~strike~~` is a GFM extension and the
        // bubble menu can produce it on every surface, so gating it would mean
        // a button that writes text nothing draws. Its other additions — tables,
        // autolinks — are things the editor cannot produce but the renderer can
        // safely show, which is the harmless direction for that asymmetry.
        //
        // Task lists are the one part still gated, via `components.input` below.
        remarkPlugins={[remarkGfm]}
        // `rehype-raw` is what draws `<u>` and `<details>`; `rehype-sanitize`
        // is what stops it drawing anything else. ORDER MATTERS — sanitize has
        // to run after raw, or it filters a tree that has no raw HTML in it yet
        // and every tag sails through.
        rehypePlugins={[rehypeRaw, [rehypeSanitize, HTML_SCHEMA]]}
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
