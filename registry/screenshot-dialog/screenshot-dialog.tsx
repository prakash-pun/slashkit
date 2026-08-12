"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { PlatformScreenshots } from "@/lib/slashkit/commands";
import {
  DEFAULT_SCREENSHOT_SLOTS,
  MIN_DESCRIPTION_LENGTH,
  registerScreenshotRequester,
  type ScreenshotSlot,
} from "@/lib/slashkit/screenshot-request";
import { cn } from "@/lib/utils";

/**
 * The `/screenshot` command's dialog: one description, N optional uploads.
 *
 * ── One description for every image, deliberately ──────────────────────────
 * The phone and web screenshots of the same instructional step illustrate the
 * same action — "tap the + button to add a budget" describes both correctly.
 * Separate fields would mean writing the same sentence twice and letting them
 * drift. If a case ever genuinely needs different text per platform, that is an
 * extension point, not something to build ahead of the need.
 *
 * ── Why the description gates the uploads ──────────────────────────────────
 * `buildPlatformAlt` falls back to a bare `ios` / `web` tag when the
 * description is empty, which still FILTERS correctly but announces itself to a
 * screen reader as the word "ios" and gives a search engine nothing. That
 * fallback exists so content authored before the format existed keeps working —
 * NOT as a shortcut for new content. Making it reachable only by never filling
 * in the field, and leaving the upload buttons disabled until then, is what
 * keeps it from being the path of least resistance.
 *
 * ── Why every upload is optional ───────────────────────────────────────────
 * Not every step has a counterpart on the other platform: a widget screenshot
 * has no web equivalent, a browser-extension one has no phone equivalent.
 * Requiring both would mean padding articles with irrelevant images.
 */
function Slot({
  label,
  url,
  busy,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  url: string | null;
  busy: boolean;
  disabled: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      {url ? (
        <div className="relative overflow-hidden rounded-lg border border-border/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-28 w-full bg-muted object-contain" />
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${label}`}
            className={cn(
              "absolute top-1 right-1 rounded-md bg-background/90 p-1 text-muted-foreground",
              "transition-colors hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={disabled || busy}
          className={cn(
            "flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60",
            "text-xs text-muted-foreground transition-colors",
            "hover:border-border hover:bg-muted/40",
            "disabled:pointer-events-none disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {busy ? "Uploading…" : "Choose file"}
        </button>
      )}
    </div>
  );
}

/**
 * The form, mounted only while the dialog is open so every field resets between
 * invocations without a pile of clearing effects.
 */
function ScreenshotForm({
  slots,
  onUploadImage,
  onDone,
}: {
  slots: ScreenshotSlot[];
  onUploadImage: () => Promise<string | null>;
  onDone: (result: PlatformScreenshots | null) => void;
}) {
  const [description, setDescription] = useState("");
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const describedEnough = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const hasAnyImage = Object.values(urls).some(Boolean);

  const pick = async (tag: string) => {
    setBusy(tag);
    try {
      const url = await onUploadImage();
      // A null is a cancel or a failure your uploader already reported; there
      // is nothing useful to add here.
      if (url) setUrls((current) => ({ ...current, [tag]: url }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a screenshot</DialogTitle>
        <DialogDescription>
          Describe the step once — it becomes the alt text for every image, so
          it is what a screen reader reads out and what search engines index.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tap the + button at the bottom of the Budgets tab"
            rows={2}
            autoFocus
            maxLength={200}
            aria-label="Screenshot description"
          />
          <p className="text-xs text-muted-foreground">
            {describedEnough
              ? "Describe what the screenshot shows, not that it is a screenshot."
              : "Add a description to enable the uploads."}
          </p>
        </div>

        <div className="flex gap-3">
          {slots.map(({ tag, label }) => (
            <Slot
              key={tag}
              label={label}
              url={urls[tag] ?? null}
              busy={busy === tag}
              // The gate. Everything below the description stays inert until
              // there is one — see the note at the top of this file.
              disabled={!describedEnough}
              onPick={() => void pick(tag)}
              onClear={() => setUrls((current) => ({ ...current, [tag]: null }))}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Add whichever platforms this step actually has. Readers pick which one
          they see with the toggle on the page.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <Button
          disabled={!describedEnough || !hasAnyImage || busy !== null}
          onClick={() => onDone({ description: description.trim(), urls })}
        >
          Insert
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Mount this once beside your editor. It owns the dialog and answers the
 * `requestScreenshots()` calls the slash command makes.
 *
 *     <ScreenshotDialogHost onUploadImage={onUploadImage} />
 *     <SlashCommandEditor commands={[...defaultCommands({ onUploadImage }),
 *                                    screenshotCommand(requestScreenshots)]} … />
 */
export function ScreenshotDialogHost({
  onUploadImage,
  slots = DEFAULT_SCREENSHOT_SLOTS,
}: {
  /** The same uploader the `/image` command uses. Slashkit never uploads. */
  onUploadImage: () => Promise<string | null>;
  slots?: ScreenshotSlot[];
}) {
  const [pending, setPending] = useState<{
    resolve: (result: PlatformScreenshots | null) => void;
  } | null>(null);

  useEffect(() => {
    registerScreenshotRequester(
      () => new Promise((resolve) => setPending({ resolve })),
    );
    // Cleared on unmount so a stale closure cannot resolve into a dialog that
    // is no longer on the page — the command then inserts nothing, which is the
    // same as a cancel.
    return () => registerScreenshotRequester(null);
  }, []);

  const finish = (result: PlatformScreenshots | null) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <Dialog
      open={pending !== null}
      // Escape, the close button and an overlay click all mean "cancel", and
      // the promise MUST settle on every one of them — a command awaiting a
      // promise that never resolves leaves the editor waiting forever.
      onOpenChange={(open) => !open && finish(null)}
    >
      <DialogContent className="sm:max-w-md">
        {pending && (
          <ScreenshotForm
            slots={slots}
            onUploadImage={onUploadImage}
            onDone={finish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
