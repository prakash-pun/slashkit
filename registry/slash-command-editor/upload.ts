/**
 * The file-picker half of an image upload, with the network half left to you.
 *
 * Slashkit never uploads anything — `upload` is your function, and whatever it
 * does (a signed S3 PUT, a `POST /api/upload`, a Vercel Blob client upload, a
 * base64 data URL in a test) is entirely your business. This module only owns
 * the part that is the same everywhere and easy to get subtly wrong: driving a
 * file input from script.
 *
 * Use it or don't — `onUploadImage` is just `() => Promise<string | null>`, and
 * anything with that shape works.
 */

export interface ImagePickerOptions {
  /**
   * Turns a chosen file into a public URL. Resolve `null` to insert nothing —
   * that is also what a cancel resolves to, and callers treat them the same.
   *
   * Never let this reject: a rejected promise inside a ProseMirror command has
   * no owner and surfaces as an unhandled rejection. Catch and resolve `null`.
   */
  upload: (file: File) => Promise<string | null>;
  /** The picker's `accept` attribute. Mirror your server's allow-list. */
  accept?: string;
  /** Rejected before the round trip. Mirror your server's cap. */
  maxBytes?: number;
  /**
   * Told when a file is refused locally, so you can toast it. Slashkit ships no
   * toast library and no opinion about which one you use.
   */
  onRejected?: (reason: "too-large", file: File) => void;
}

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Builds an `onUploadImage` for `defaultCommands` from a single upload
 * function.
 *
 *     const onUploadImage = createImagePicker({
 *       upload: async (file) => {
 *         const body = new FormData();
 *         body.append("file", file);
 *         const res = await fetch("/api/upload", { method: "POST", body });
 *         return res.ok ? (await res.json()).url : null;
 *       },
 *     });
 */
export function createImagePicker({
  upload,
  accept = DEFAULT_ACCEPT,
  maxBytes = DEFAULT_MAX_BYTES,
  onRejected,
}: ImagePickerOptions): () => Promise<string | null> {
  return async () => {
    const file = await pickFile(accept);
    if (!file) return null;

    if (file.size > maxBytes) {
      onRejected?.("too-large", file);
      return null;
    }

    try {
      return await upload(file);
    } catch {
      // A command cannot handle a rejection usefully, and an unhandled one is
      // noise in someone's error tracker. "Could not upload" and "cancelled"
      // both mean "insert nothing".
      return null;
    }
  };
}

/**
 * A file input driven entirely from script.
 *
 * The element is appended to the document, not left detached: Safari refuses to
 * open the picker for an input that isn't in the DOM. `cancel` fires in every
 * current browser when the dialog is dismissed, which is what keeps this
 * promise from hanging forever — and the `change` path removes the input itself
 * so the two handlers never both run against a live element.
 */
export function pickFile(accept = DEFAULT_ACCEPT): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";

    const finish = (file: File | null) => {
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => finish(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}
