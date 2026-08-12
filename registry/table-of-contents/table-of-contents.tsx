import type { DocHeading } from "@/lib/slashkit/markdown-headings";
import { cn } from "@/lib/utils";

/**
 * A document's contents, built from its own headings.
 *
 * ── Why this is not an editor extension ────────────────────────────────────
 * A contents list is not CONTENT. Storing it in the body would mean a block
 * that goes stale the moment a heading is renamed and has to be manually kept
 * in order. Deriving it at render time from the headings the author already
 * wrote cannot drift, costs nothing to author, and works on every document ever
 * written including the ones that predate this component.
 *
 * (Tiptap's own table-of-contents is also a paid Pro extension, which settles
 * it a second time.)
 *
 * Plain anchors, no scroll-spy: the ids come from `ContentMarkdownRenderer`,
 * which stamps them through the same `headingId` used here. A statically
 * rendered page ships no JavaScript for the article itself, and highlighting
 * the section you happen to be level with is decoration next to being able to
 * jump to one.
 */

/** Below this a contents list is furniture, not navigation. */
const MIN_HEADINGS = 3;

export function TableOfContents({
  headings,
  title = "Contents",
  minHeadings = MIN_HEADINGS,
  className,
}: {
  headings: DocHeading[];
  title?: string;
  minHeadings?: number;
  className?: string;
}) {
  // A two-section document is entirely visible from the top of the page; a
  // contents list there costs a screenful and saves nothing.
  if (headings.length < minHeadings) return null;

  return (
    <nav
      aria-labelledby="toc-heading"
      className={cn("rounded-xl border border-border/60 px-4 py-3", className)}
    >
      <h2
        id="toc-heading"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h2>

      <ol className="mt-2 space-y-1.5">
        {headings.map((heading) => (
          <li
            key={heading.id}
            // Subheadings indent under their heading, which is the only thing
            // that makes the list read as a structure rather than a flat run of
            // links.
            className={cn("text-sm", heading.level === 3 && "pl-4")}
          >
            <a
              href={`#${heading.id}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
