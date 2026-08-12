"use client";

import { useEffect, type ComponentType } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Chooses which platform's images a body shows.
 *
 * A segmented control rather than a dropdown: there are usually only two
 * options, so both should be visible and one tap apart instead of hidden behind
 * a menu. Pairs with `ContentMarkdownRenderer`'s `activePlatform` and the
 * `|tag` alt convention in `parse-platform-alt.ts`.
 *
 * ── Fully controlled, and router-free ──────────────────────────────────────
 * This component owns no state and knows nothing about your router. That is
 * deliberate: the best place for this choice is usually the URL — `?device=ios`
 * is shareable, and it lets a server component render the right images with no
 * client JavaScript at all — but "the URL" means something different in Next,
 * Remix, TanStack Router and a plain Vite app. So you own `current`, and
 * `onChange` is where you push a query param, set state, or both.
 *
 * `useRememberedPlatform` below is the optional convenience half.
 */
export interface DeviceToggleOption {
  value: string;
  label: string;
  /** Any lucide icon, or omit for a text-only pill. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

/** The pair this convention ships with. Pass your own for anything else. */
export const DEFAULT_DEVICE_OPTIONS: DeviceToggleOption[] = [
  { value: "ios", label: "iPhone", icon: Smartphone },
  { value: "web", label: "Web", icon: Monitor },
];

export interface DeviceToggleProps {
  options?: DeviceToggleOption[];
  current: string;
  onChange: (value: string) => void;
  /** Names the group for a screen reader. */
  label?: string;
  className?: string;
}

export function DeviceToggle({
  options = DEFAULT_DEVICE_OPTIONS,
  current,
  onChange,
  label = "Show screenshots for",
  className,
}: DeviceToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-fit items-center rounded-lg border border-border/40 bg-muted/50 p-[3px]",
        className,
      )}
    >
      {options.map(({ value, label: optionLabel, icon: Icon }) => {
        const active = value === current;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap",
              "transition-[color,background-color,box-shadow,border-color] duration-150 ease-out",
              "focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/25 focus-visible:outline-none",
              active
                ? "bg-card text-foreground shadow-sm dark:border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon aria-hidden className="size-4" />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Remembers the last choice across pages, without touching your router.
 *
 * ── Why the default is fixed and not sniffed ───────────────────────────────
 * Never detect the platform from the user agent. UA detection guesses, and its
 * failure mode is overriding a link someone deliberately shared as
 * `?device=ios`. A fixed default that a visible toggle changes is wrong for
 * nobody in a way they cannot immediately fix.
 *
 * ── Why `explicit` exists ──────────────────────────────────────────────────
 * A URL that names a device itself must be honoured, never silently overridden
 * by a stale choice from a visit weeks ago. The remembered value is a DEFAULT,
 * not a rule — so pass `explicit: true` when the URL said so, and this hook
 * stays out of the way entirely.
 *
 *     const remembered = useRememberedPlatform({
 *       current: device,
 *       explicit: searchParams.has("device"),
 *       onAdopt: (d) => router.replace(`${pathname}?device=${d}`, { scroll: false }),
 *     });
 *     // …and call remembered.remember(next) from the toggle's onChange.
 */
export function useRememberedPlatform({
  current,
  explicit,
  onAdopt,
  storageKey = "slashkit-platform",
  allowed,
}: {
  current: string;
  /** Whether the current value was named explicitly (usually: by the URL). */
  explicit: boolean;
  /** Called once on mount when a different remembered value should be adopted. */
  onAdopt: (value: string) => void;
  storageKey?: string;
  /** Values that may be adopted. Anything else in storage is ignored. */
  allowed?: readonly string[];
}) {
  useEffect(() => {
    if (explicit) return;

    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(storageKey);
    } catch {
      // Private mode or blocked storage. Losing the memory of a toggle is not
      // worth breaking the toggle over.
      return;
    }

    if (!remembered || remembered === current) return;
    if (allowed && !allowed.includes(remembered)) return;

    onAdopt(remembered);
    // Mount only. Re-running on `current` would fight the navigation it just
    // started, and `explicit` cannot change without a new page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    /** Call from the toggle's `onChange` for a choice the visitor made. */
    remember(value: string) {
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        // As above — convenience only.
      }
    },
  };
}
