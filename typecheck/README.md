# Typecheck stubs

These files exist **only so `npm run typecheck` can run inside this repo**. None
of them is part of the registry, none is ever installed into a consumer's
project, and none is listed in `registry.json`.

## Why they are needed

Every file under `registry/` imports through the aliases a CONSUMER will have —
`@/lib/slashkit/commands`, `@/components/ui/popover`, `@/lib/utils`. Those
resolve after `shadcn add` has copied the files into place. In this repo the
sources still live at `registry/<item>/<file>`, and two of the aliases point at
things this repo does not contain at all:

- `@/lib/utils` — the consumer's `cn`, written by `shadcn init`.
- `@/components/ui/*` — shadcn/ui primitives, pulled in via `registryDependencies`.

So `tsconfig.json` maps the Slashkit aliases onto the real source directories,
and the two stubs below stand in for what the consumer brings.

## What they are not

They are **not** a specification of those components. `Button` here takes the
props Slashkit passes and nothing more. If a stub and the real shadcn/ui
component ever disagree in a way that matters, the real check is the one that
catches it:

```bash
npm run verify
```

That installs the actual shadcn/ui components into a throwaway app through
`shadcn add` and typechecks against those. This directory only buys fast
feedback on a pull request without a full install.
