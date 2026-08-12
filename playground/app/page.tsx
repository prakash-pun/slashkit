"use client";

import { useEffect, useState } from "react";

import { EditorDemo } from "@/components/demos/editor-demo";
import { ChangelogDemo } from "@/components/demos/changelog-demo";
import { HelpDemo } from "@/components/demos/help-demo";
import { BlogDemo } from "@/components/demos/blog-demo";
import { cn } from "@/lib/utils";

const REGISTRY_URL = "https://prakash-pun.github.io/slashkit/r/{name}.json";

const TABS = [
  {
    id: "editor",
    label: "Editor",
    item: "slash-command-editor",
    blurb: "The canvas on its own. No feature assumed.",
    render: () => <EditorDemo />,
  },
  {
    id: "changelog",
    label: "Changelog",
    item: "changelog",
    blurb:
      "A whole release as one document of highlight blocks, extracted to a backend-ready array.",
    render: () => <ChangelogDemo />,
  },
  {
    id: "help",
    label: "Help articles",
    item: "help-articles",
    blurb:
      "Per-platform screenshots, with the reader choosing which walkthrough they see.",
    render: () => <HelpDemo />,
  },
  {
    id: "blog",
    label: "Blog",
    item: "blog",
    blurb: "Quotes, dividers and checklists, plus the SEO helpers.",
    render: () => <BlogDemo />,
  },
] as const;

export default function Page() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("editor");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Header />

      <nav
        aria-label="Demos"
        className="mt-10 flex flex-wrap gap-1 border-b border-border/60"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            aria-current={t.id === active ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              t.id === active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-1">
        <p className="text-sm text-muted-foreground">{tab.blurb}</p>
        <InstallLine item={tab.item} />
      </div>

      <div className="mt-8">
        {/* Keyed so switching tabs remounts the editor. Every Slashkit editor
            reads its body once on mount by design — see the note on `body` in
            SlashCommandEditor — so a remount is exactly how you load a
            different document. */}
        <div key={tab.id}>{tab.render()}</div>
      </div>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Slashkit
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            A <code className="rounded bg-muted px-1 py-0.5 text-[13px]">/</code>{" "}
            command editor and the renderers that draw what it writes,
            distributed as a shadcn registry — real source files copied into
            your project, not a package.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <p className="mt-4 max-w-2xl rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
        <strong className="font-medium text-foreground">
          Nothing on this page talks to a server.
        </strong>{" "}
        Image uploads resolve to object URLs, because upload is a callback you
        supply. That is the entire design: swap one function and these editors
        are production-ready.
      </p>

      <div className="mt-4">
        <CopyLine
          label="Add the registry to components.json"
          value={`"registries": { "@slashkit": "${REGISTRY_URL}" }`}
        />
      </div>
    </header>
  );
}

function InstallLine({ item }: { item: string }) {
  return <CopyLine value={`npx shadcn@latest add @slashkit/${item}`} />;
}

function CopyLine({ label, value }: { label?: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      {label && (
        <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
          {label}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title="Copy"
        className={cn(
          "group flex w-full max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-border/60",
          "bg-muted/40 px-3 py-2 text-left font-mono text-xs text-foreground transition-colors",
          "hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="whitespace-nowrap">{value}</span>
        <span className="ml-auto shrink-0 pl-2 font-sans text-[11px] text-muted-foreground">
          {copied ? "copied" : "copy"}
        </span>
      </button>
    </div>
  );
}

/**
 * Here to prove a point rather than to be a feature: every Slashkit component
 * styles itself from shadcn/ui tokens, so the editor follows your theme without
 * knowing the theme exists.
 */
function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-pressed={dark}
      className={cn(
        "shrink-0 rounded-lg border border-border/60 px-3 py-1.5 text-sm text-muted-foreground",
        "transition-colors hover:border-border hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 pt-6 text-sm text-muted-foreground">
      <p>
        Every component on this page was installed into this app by{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[13px]">
          shadcn add
        </code>{" "}
        from the registry next door — the same command you would run. If a demo
        works here, the install path works.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <a
          href="https://github.com/prakash-pun/slashkit"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Source
        </a>
        <a
          href="https://prakash-pun.github.io/slashkit/"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Registry index
        </a>
        <span className="text-muted-foreground/70">MIT</span>
      </p>
    </footer>
  );
}
