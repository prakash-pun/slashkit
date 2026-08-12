import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";

import {
  SlashCommandList,
  type SlashCommandListHandle,
} from "@/components/slashkit/slash-command-list";
import type { SlashCommandItem } from "@/lib/slashkit/commands";

/**
 * The `/` menu as a Tiptap extension.
 *
 * ── Positioning: `@floating-ui/dom`, not tippy.js ──────────────────────────
 * tippy is unmaintained and pulls in Popper 2; floating-ui is its maintained
 * successor and is what Radix — and therefore shadcn/ui — already uses, so a
 * consumer of this registry very likely has it installed regardless. Nothing
 * about the extension depends on which one: `place()` below is thirteen lines,
 * and swapping it is the whole migration if you disagree.
 */

/** Keeps the menu pinned to the caret, flipping above when the page runs out. */
function place(element: HTMLElement, getRect: () => DOMRect) {
  void computePosition({ getBoundingClientRect: getRect }, element, {
    placement: "bottom-start",
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  }).then(({ x, y }) => {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
}

export interface SlashCommandOptions {
  /**
   * Which commands this editor offers.
   *
   * There is no default on purpose. A default set would be one every surface
   * silently inherits, including the ones whose schema cannot honour half of
   * it — see the note at the top of `commands.ts`.
   */
  commands: SlashCommandItem[];
  suggestion: Partial<SuggestionOptions<SlashCommandItem>>;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      commands: [],
      suggestion: {
        char: "/",
        startOfLine: false,
        // Without this a "/" inside a URL or a date opens the menu mid-word.
        allowSpaces: false,
        command: ({ editor, range, props }) => props.command({ editor, range }),
      } satisfies Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        ...this.options.suggestion,

        items: ({ query }) =>
          this.options.commands.filter((c) =>
            c.title.toLowerCase().includes(query.toLowerCase()),
          ),

        render: () => {
          let renderer: ReactRenderer<SlashCommandListHandle> | null = null;
          let container: HTMLDivElement | null = null;
          // Set by Escape. The suggestion plugin stays active as long as the
          // text still matches, so without this the menu would pop straight
          // back up on the next keystroke and Escape would do nothing.
          let dismissed = false;

          /** `clientRect` is nullable while the view settles; treat that as closed. */
          const rectOf = (props: SuggestionProps<SlashCommandItem>) =>
            props.clientRect?.() ?? null;

          const teardown = () => {
            renderer?.destroy();
            container?.remove();
            renderer = null;
            container = null;
          };

          return {
            onStart: (props) => {
              if (!rectOf(props)) return;

              renderer = new ReactRenderer(SlashCommandList, {
                editor: props.editor,
                props: {
                  items: props.items,
                  onSelect: (item: SlashCommandItem) => props.command(item),
                },
              });

              // Appended to <body> rather than next to the editor: an editor
              // usually sits inside a bordered, scrollable column, and a menu
              // positioned within it gets clipped the moment it overflows.
              container = document.createElement("div");
              container.style.position = "absolute";
              container.style.zIndex = "50";
              container.style.top = "0";
              container.style.left = "0";
              container.appendChild(renderer.element);
              document.body.appendChild(container);

              place(container, () => rectOf(props) as DOMRect);
            },

            onUpdate: (props) => {
              if (dismissed) return;

              renderer?.updateProps({
                items: props.items,
                onSelect: (item: SlashCommandItem) => props.command(item),
              });
              if (container && rectOf(props)) {
                place(container, () => rectOf(props) as DOMRect);
              }
            },

            onKeyDown: (props) => {
              if (dismissed) return false;

              if (props.event.key === "Escape") {
                dismissed = true;
                teardown();
                // Handled, so the key closes the menu rather than bubbling out
                // to whatever dialog or drawer the editor is sitting inside.
                return true;
              }
              return renderer?.ref?.onKeyDown(props.event) ?? false;
            },

            // Fires when the suggestion deactivates — the "/" was deleted, the
            // query stopped matching, or a command ran. Also the reset point
            // for `dismissed`, so the next "/" opens a fresh menu.
            onExit: () => {
              dismissed = false;
              teardown();
            },
          };
        },
      }),
    ];
  },
});
