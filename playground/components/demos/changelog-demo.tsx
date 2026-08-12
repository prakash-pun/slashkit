"use client";

import { useState } from "react";

import { ChangelogEditor } from "@/components/slashkit/changelog-editor";
import { WhatsNewRelease } from "@/components/slashkit/whats-new-list";
import type { ExtractedHighlight } from "@/lib/slashkit/extract-highlights";
import { DemoShell, SourcePeek } from "@/components/demo-shell";
import { SAMPLE_HIGHLIGHTS, demoCommandOptions } from "@/lib/demo";

/**
 * The changelog demo, and the one that earns the doc/markdown distinction its
 * paragraph in the README.
 *
 * Everything on the right is derived from `onChange` — no save, no request, no
 * round trip through a server. Type in a highlight title and the public row
 * updates, because the editor and the renderer read the same palette from
 * `highlight-style.ts`.
 */
export function ChangelogDemo() {
  const [highlights, setHighlights] = useState<ExtractedHighlight[]>([]);
  const [stray, setStray] = useState(0);

  return (
    <DemoShell
      note={
        <>
          Press <Key>/</Key> for the menu, or use the <Key>+</Key> button.
          <strong className="font-medium text-foreground">
            {" "}
            /highlight
          </strong>{" "}
          starts a new entry — it inserts after the one you are standing in,
          because the schema forbids nesting. Click an icon to change it, and
          hover a row for its type and delete controls.
        </>
      }
      editor={
        <>
          <ChangelogEditor
            highlights={SAMPLE_HIGHLIGHTS}
            onChange={setHighlights}
            onStrayContentChange={setStray}
            commandOptions={demoCommandOptions}
          />
          {stray > 0 && (
            <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {stray} block{stray === 1 ? "" : "s"} sitting outside a highlight
              would not be saved. Slashkit counts them so you can say so —
              silently dropping what someone typed is the worst option available.
            </p>
          )}
        </>
      }
      output={
        <>
          <WhatsNewRelease
            heading="Version 1.4.0"
            meta="12 August 2026"
            highlights={highlights}
          />
          <SourcePeek
            label={`onChange → ExtractedHighlight[] (${highlights.length})`}
            value={JSON.stringify(highlights, null, 2)}
          />
        </>
      }
    />
  );
}

export function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}
