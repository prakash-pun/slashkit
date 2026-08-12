"use client";

import { createImagePicker } from "@/lib/slashkit/upload";

/**
 * The callback seams, wired up for a demo that has no server.
 *
 * This file is the playground practising what the kit preaches. `onUploadImage`
 * is the one place Slashkit would need a network in a real app — and here it
 * resolves an object URL instead, so `/image` and `/screenshot` genuinely work
 * with nothing behind them. Swap this one function for a real upload and the
 * editors are production-ready; nothing else changes.
 *
 * That is the whole argument for the callback design, and it is more convincing
 * to demonstrate than to describe.
 */
export const demoUploadImage = createImagePicker({
  // Never revoked, deliberately: the URL has to outlive this call because it is
  // now sitting in a document the user can keep editing. A real uploader hands
  // back a permanent URL, which is exactly the same contract.
  upload: async (file) => URL.createObjectURL(file),
  onRejected: (reason, file) =>
    // eslint-disable-next-line no-alert
    window.alert(`${file.name} was rejected: ${reason}`),
});

export const demoCommandOptions = { onUploadImage: demoUploadImage };

/** A release, as an API would hand it back. */
export const SAMPLE_HIGHLIGHTS = [
  {
    title: "Trip budgets",
    body: "Set a **budget** per trip and watch it as you spend.\n\n- Rolls over what you don't use\n- Warns before you cross the line",
    type: "feature",
    icon: "🧳",
    iconType: "EMOJI",
  },
  {
    title: "Faster sync",
    body: "Accounts refresh in about half the time they used to.",
    type: "improvement",
    icon: null,
    iconType: null,
  },
  {
    title: "Duplicate tags",
    body: "Tags no longer duplicate after an edit made offline.",
    type: "fix",
    icon: null,
    iconType: null,
  },
];

export const SAMPLE_ARTICLE = `## Creating your first budget

A budget is a limit on one category for one month. Start with the category you
overspend most — you can add the rest later.

### From the app

![The Budgets tab with the plus button highlighted|ios](https://placehold.co/640x360/1f2937/e5e7eb.png?text=iPhone+—+Budgets+tab)

![The Budgets page with the New budget button|web](https://placehold.co/960x540/1f2937/e5e7eb.png?text=Web+—+Budgets+page)

Pick a category, set the amount, and save. That's the whole flow.

### Watch it done

[video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

Budgets reset on the first of each month. See [the pricing page](https://example.com/pricing)
if you want more than three.`;

export const SAMPLE_POST = `Most budgeting advice fails for the same reason: it asks you to predict a
month you have not lived yet.

## Start from what you already spent

Pull the last three months and take the median, not the average — one broken
boiler should not set your grocery budget forever.

> A budget is a hypothesis about your own behaviour. Treat it like one.

### The three that actually matter

- **Groceries** — the one people underestimate most
- **Transport** — the one that moves with your job
- **Everything else** — one bucket, on purpose

- [ ] Pull three months of statements
- [ ] Take the median per category
- [ ] Set one limit, not seven

---

## Review it monthly, not daily

Checking daily turns a budget into a scoreboard, and scoreboards make people
quit. Once a month is enough to notice a trend and early enough to act on it.`;
