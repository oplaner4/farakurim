---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Hooks

- **A `use` prefix means a React hook**: the function calls other hooks and follows the rules of hooks. A helper
  that calls no hook must not start with `use` (name it after what it does: `parsePage`, `archiveHref`).
- **Every hook lives in its own `use-<name>.ts` file**, named after the hook (`useLoadMore` → `use-load-more.ts`),
  never inside a component, a pure-logic module or a grab-bag file. A file may hold a few hooks that only make sense
  together (`use-now.ts`: `useNow`, `useToday`, `useHydrated`).
- A hook file exports only hooks and the types of their signatures. Constants and plain functions that other code
  also uses go into a regular module (`PAGE_PARAM`, `QUERY_PARAM` and the nuqs parsers in `query-params.ts`).
- **Every hook lives in `src/hooks/`**, also one that only one component uses (`use-archive-search.ts`,
  `use-todays-quote.ts`); never next to a component, in `src/lib` or in `src/content`. **Why:** one place to find
  them, and the folders stay one kind each (components render, `lib` is pure logic, hooks hold state and effects).
  Hook files start with `"use client"`.
