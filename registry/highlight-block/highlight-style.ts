/**
 * The visual vocabulary shared by the editor's highlight blocks and the public
 * "What's New" renderer.
 *
 * ── Why only tokens live here, and not a component ─────────────────────────
 * The two surfaces are genuinely different technically — one is an interactive
 * ProseMirror node view with a contentEditable body, the other is static
 * server-rendered markup — and forcing them through one React component would
 * fight both. But the reason they have to MATCH is that the editor is the
 * preview: there is no separate preview panel to check your work against, so if
 * these palettes drift, the authoring view silently stops telling the truth
 * about what ships. Sharing the map means a colour change lands on both by
 * construction rather than by remembering to.
 *
 * ── This is the seam you edit ──────────────────────────────────────────────
 * Add your own types by editing this object. It is a module-level export rather
 * than a prop because Tiptap's NodeView API has no clean way to pass extra
 * runtime props through to a node view — this is the pragmatic seam, and in a
 * registry where the file is copied into your project it is a perfectly good
 * one. Both the editor's `<select>` and the public list read their options from
 * here, so a new type appears in both at once.
 *
 * The `dark:` halves are not optional decoration: a fixed `#EEEDFE` square
 * glows white on a dark background, and most apps ship dark mode.
 */
export interface HighlightTypeStyle {
  /** Fallback when a highlight carries no icon of its own. */
  emoji: string;
  /** Tint for the rounded icon square. */
  square: string;
  /** Tint for the small type pill in the editor. */
  pill: string;
  label: string;
}

export const HIGHLIGHT_TYPE_STYLES: Record<string, HighlightTypeStyle> = {
  feature: {
    emoji: "✨",
    square:
      "bg-[#EEEDFE] text-[#3C3489] dark:bg-[#3C3489]/35 dark:text-[#C4BDF7]",
    pill: "bg-[#EEEDFE] text-[#3C3489] dark:bg-[#3C3489]/40 dark:text-[#C4BDF7]",
    label: "Feature",
  },
  improvement: {
    emoji: "⚡",
    square:
      "bg-[#E1F5EE] text-[#0F6E56] dark:bg-[#0F6E56]/35 dark:text-[#7FD9BE]",
    pill: "bg-[#E1F5EE] text-[#0F6E56] dark:bg-[#0F6E56]/40 dark:text-[#7FD9BE]",
    label: "Improvement",
  },
  fix: {
    emoji: "🔧",
    square:
      "bg-[#FAECE7] text-[#993C1D] dark:bg-[#993C1D]/35 dark:text-[#E9A98B]",
    pill: "bg-[#FAECE7] text-[#993C1D] dark:bg-[#993C1D]/40 dark:text-[#E9A98B]",
    label: "Fix",
  },
};

/** The type a new highlight starts as. Must be a key of the map above. */
export const DEFAULT_HIGHLIGHT_TYPE = "feature";

/** Every type the editor offers, in menu order. */
export const HIGHLIGHT_TYPES = Object.keys(HIGHLIGHT_TYPE_STYLES);

/**
 * An unknown `type` still renders.
 *
 * Deliberate: store this column as a free string, not an enum, so a backend can
 * add a fourth kind without a client that rejects it. Falling back is what
 * makes that safe.
 */
export const styleForType = (type: string): HighlightTypeStyle =>
  HIGHLIGHT_TYPE_STYLES[type] ?? HIGHLIGHT_TYPE_STYLES[DEFAULT_HIGHLIGHT_TYPE];

/**
 * The icon to draw for a highlight.
 *
 * `iconType` exists so an icon authored on another platform round-trips through
 * this editor without losing what it was. Anything that is not `"EMOJI"` — an
 * SF Symbol name like "sparkles", say — would print as that literal word in a
 * box on the web, so it falls back to the type's emoji instead. That is the
 * correct read of an icon this platform cannot draw.
 */
export function displayEmoji(
  icon: string | null | undefined,
  iconType: string | null | undefined,
  type: string,
): string {
  if (iconType === "EMOJI" && icon?.trim()) return icon.trim();
  return styleForType(type).emoji;
}
