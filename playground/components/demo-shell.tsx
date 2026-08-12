"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The two-column frame every demo uses: what you author on the left, what
 * ships on the right.
 *
 * Side by side rather than tabbed, because the whole claim being demonstrated
 * is that those two things match. You cannot check that by flipping between
 * them.
 */
export function DemoShell({
  editor,
  output,
  editorLabel = "Editor",
  outputLabel = "What ships",
  note,
}: {
  editor: ReactNode;
  output: ReactNode;
  editorLabel?: string;
  outputLabel?: string;
  note?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {note && (
        <p className="text-sm leading-relaxed text-muted-foreground">{note}</p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Pane label={editorLabel}>{editor}</Pane>
        <Pane label={outputLabel} muted>
          {output}
        </Pane>
      </div>
    </div>
  );
}

function Pane({
  label,
  children,
  muted = false,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
        {label}
      </h3>
      <div
        className={cn(
          "rounded-xl border border-border/60 p-4",
          muted && "bg-muted/30",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** A collapsible peek at the raw markdown or JSON a demo produces. */
export function SourcePeek({
  label,
  value,
  open = false,
}: {
  label: string;
  value: string;
  open?: boolean;
}) {
  return (
    <details open={open} className="mt-4 group">
      <summary className="cursor-pointer list-none text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase select-none hover:text-foreground">
        {label}
        <span className="ml-1 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 text-xs leading-relaxed">
        <code>{value || "(empty)"}</code>
      </pre>
    </details>
  );
}
