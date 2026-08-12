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
    body: "Accounts refresh in about half the time they used to.\n\n1. Balances first\n2. Then transactions\n3. Then categories\n\nSet `sync.mode` to `eager` to keep the old order.",
    type: "improvement",
    icon: null,
    iconType: null,
  },
  {
    title: "Duplicate tags",
    body: "Tags no longer duplicate after an edit made offline.\n\n> If you already have duplicates, opening the tag list once will merge them.",
    type: "fix",
    icon: null,
    iconType: null,
  },
];

export const SAMPLE_ARTICLE = `## Creating your first budget

A budget is a limit on one category for one month. Start with the category you
overspend most — you can add the rest later.

> Budgets reset on the first of the month. Nothing carries over unless you
> switch on rollover.

### The steps

1. Open the **Budgets** tab
2. Pick a category, then set an amount
3. Save — the limit applies from today

Prefer the API? Call \`POST /v1/budgets\` with a \`categoryId\` and \`limit\`.

---

### From the app

![The Budgets tab with the plus button highlighted|ios](https://placehold.co/640x360/1f2937/e5e7eb.png?text=iPhone+—+Budgets+tab)

![The Budgets page with the New budget button|web](https://placehold.co/960x540/1f2937/e5e7eb.png?text=Web+—+Budgets+page)

Pick a category, set the amount, and save. That's the whole flow.

### Watch it done

[video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

Budgets reset on the first of each month. See [the pricing page](https://example.com/pricing)
if you want more than three.

<details>
<summary>Why can't I set a budget for a whole year?</summary>

Budgets are monthly by design. A yearly limit hides the month where you went
over, which is the month you actually wanted to know about.

- Use a **goal** for a yearly target
- Use a **budget** for a monthly ceiling

</details>

<details>
<summary>Does this work offline?</summary>

Yes. Edits queue and sync when you reconnect — the <u>last write wins</u>, so
the same budget edited on two devices keeps whichever you saved most recently.

</details>`;

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
quit. Once a month is enough to notice a trend and early enough to act on it.

In order of what actually moves the number:

1. Rent, which you cannot change this month
2. Groceries, which you can
3. ~~Coffee~~ — it is never the coffee

<details>
<summary>What about irregular costs — insurance, car tax?</summary>

Divide the annual figure by twelve and treat it as a monthly line. The month it
lands is then boring instead of a shock, which is the entire trick.

</details>`;
