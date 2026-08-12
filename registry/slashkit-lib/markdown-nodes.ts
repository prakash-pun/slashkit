/**
 * Reading the tree react-markdown hands to a component override.
 *
 * Shared by every renderer in the kit, which apply the same authoring
 * conventions (`[video](…)` cards, block images) to the same markdown subset.
 * Extracted rather than copied: these checks are subtle enough that two
 * drifting copies would mean a convention that works on one page and quietly
 * stops working on the next.
 */

export interface MdastText {
  type: "text";
  value: string;
}

export interface MdastElement {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children?: (MdastElement | MdastText)[];
}

export type MdastNode = MdastElement | MdastText;

/** Flattens an element's text, however deeply it is wrapped in other marks. */
export function textOf(node: MdastNode): string {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/**
 * A block's children with whitespace-only text nodes removed.
 *
 * Whitespace between block children shows up as text nodes, so a paragraph
 * holding one element plus a stray newline is still a paragraph holding one
 * element.
 */
function significantChildren(node: unknown): MdastNode[] | undefined {
  return (node as MdastElement | undefined)?.children?.filter(
    (child) => !(child.type === "text" && !child.value.trim()),
  );
}

/** The single element a block contains, if that is all it contains. */
function onlyElement(node: unknown, tagName: string): MdastElement | null {
  const children = significantChildren(node);
  if (children?.length !== 1) return null;

  const only = children[0];
  return only.type === "element" && only.tagName === tagName ? only : null;
}

/**
 * A paragraph that is nothing but a single link — the shape that becomes a card.
 *
 * Detection happens at the PARAGRAPH level, not on the `<a>` itself, for two
 * reasons. A card is a block element, and returning one from the `a` override
 * would nest a `<div>` inside the `<p>` react-markdown has already opened —
 * invalid markup that browsers silently hoist out of the paragraph, splitting
 * it in two. And reading the label off the `a` override's `children` means
 * stringifying React nodes, which only works while the link text is a single
 * bare string; `[**video**](…)` would stringify to "[object Object]" and quietly
 * stop matching. Walking the source tree avoids both.
 *
 * An inline link inside a sentence deliberately does NOT match — it stays an
 * inline link, since a block card mid-sentence would break the sentence apart.
 */
export function loneLinkOf(
  node: unknown,
): { href: string; label: string } | null {
  const only = onlyElement(node, "a");
  if (!only) return null;

  const href = only.properties?.href;
  if (typeof href !== "string") return null;

  return { href, label: textOf(only).trim() };
}

/**
 * A paragraph that is nothing but a single image, and that image's alt text.
 *
 * Needed by any renderer that can decide not to draw an image: returning `null`
 * from the `img` override alone leaves the wrapping `<p>` behind, and an empty
 * paragraph still takes its share of the block spacing — a gap where a
 * screenshot used to be, which looks like a broken image rather than an
 * intentionally omitted one.
 */
export function loneImageOf(node: unknown): { alt: string } | null {
  const only = onlyElement(node, "img");
  if (!only) return null;

  const alt = only.properties?.alt;
  return { alt: typeof alt === "string" ? alt : "" };
}
