import type { PlatformScreenshots } from "@/lib/slashkit/commands";

/**
 * The bridge between the `/screenshot` command and its dialog.
 *
 * ── Why a module-level slot and not a React context ────────────────────────
 * The command runs inside a ProseMirror plugin with no React context to reach,
 * so it cannot render a dialog itself. `/image` and `/video` solve the same
 * problem with a file picker and `window.prompt`, which is fine for one value —
 * but this flow needs a description field that can be VALIDATED before the
 * uploads are allowed, several optional uploads, and a preview of each. None of
 * that fits in a `window.prompt`.
 *
 * So the dialog is an ordinary React component you mount beside the editor, and
 * it registers itself here. `requestScreenshots` is what the command calls; it
 * resolves when the dialog is submitted or cancelled.
 *
 * One editor is mounted at a time in practice, so a single slot is the whole
 * requirement.
 */

type Requester = () => Promise<PlatformScreenshots | null>;

let requester: Requester | null = null;

/** Called by `ScreenshotDialogHost` on mount, and with `null` on unmount. */
export function registerScreenshotRequester(next: Requester | null): void {
  requester = next;
}

/**
 * Resolves `null` when the author cancels, when every upload was skipped, or
 * when no dialog is mounted — the command treats all three the same way, by
 * inserting nothing.
 */
export async function requestScreenshots(): Promise<PlatformScreenshots | null> {
  if (!requester) return null;
  return requester();
}

/** One upload slot in the dialog, in the order it shows them. */
export interface ScreenshotSlot {
  /** Must match a value in the renderer's `platformTags`. */
  tag: string;
  label: string;
}

export const DEFAULT_SCREENSHOT_SLOTS: ScreenshotSlot[] = [
  { tag: "ios", label: "iPhone screenshot" },
  { tag: "web", label: "Web screenshot" },
];

/**
 * How much description is enough to be worth having.
 *
 * Low enough that a genuinely short one ("Budgets tab") passes, high enough
 * that "a", "x" or a stray keystroke does not clear the gate.
 */
export const MIN_DESCRIPTION_LENGTH = 8;
