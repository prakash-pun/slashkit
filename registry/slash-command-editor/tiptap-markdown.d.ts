import type { MarkdownStorage } from "tiptap-markdown";
import type { Fragment, Node as PMNode } from "@tiptap/pm/model";

/**
 * Teaches TypeScript about `editor.storage.markdown`.
 *
 * Two gaps in what `tiptap-markdown` ships, both verified against its `dist`
 * bundle rather than guessed:
 *
 * 1. It exports `MarkdownStorage` but never merges it into Tiptap v3's `Storage`
 *    interface, which is how an extension registers what it hangs off
 *    `editor.storage`. Without that, even the documented
 *    `editor.storage.markdown.getMarkdown()` is a compile error.
 *
 * 2. `MarkdownStorage` itself only declares `options` and `getMarkdown()`, while
 *    the runtime storage also carries the `serializer` and `parser` instances.
 *    Those two are what make it possible to convert ONE block's body — the
 *    whole-document `getMarkdown()` is useless for a document that also
 *    contains custom wrapper nodes with no markdown form. See
 *    `changelog-doc.ts`, which is the entire reason this file exists.
 *
 * The package is explicitly unmaintained (its README points at Tiptap's paid
 * Conversion extension instead), so none of this will arrive upstream. Keep
 * this file next to wherever you keep your other ambient types.
 */
declare module "tiptap-markdown" {
  interface MarkdownSerializer {
    /** Accepts a Fragment or a Node; a Node renders its CHILDREN, not itself. */
    serialize(content: Fragment | PMNode): string;
  }

  interface MarkdownParser {
    /** Returns an HTML string — NOT ProseMirror nodes or JSON. */
    parse(content: string, options?: { inline?: boolean }): string;
  }
}

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage & {
      serializer: import("tiptap-markdown").MarkdownSerializer;
      parser: import("tiptap-markdown").MarkdownParser;
    };
  }
}
