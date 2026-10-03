---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Hooks

- **A `use` prefix means a React hook**: the function calls other hooks and follows the rules of hooks. A helper
  that calls no hook must not start with `use` (name it after what it does: `updateQueryParams`, `parsePage`).
- **Every hook lives in its own `use-<name>.ts` file**, named after the hook (`useLoadMore` → `use-load-more.ts`),
  never inside a component, a pure-logic module or a grab-bag file. A file may hold a few hooks that only make sense
  together (`use-now.ts`: `useNow`, `useToday`, `useHydrated`).
- A hook file exports only hooks and the types of their signatures. Constants and plain functions that other code
  also uses go into a regular module (`PAGE_PARAM`, `QUERY_PARAM` and `updateQueryParams` in `query-params.ts`).
- Shared hooks go in `src/lib/`; a hook used by one component group sits next to it
  (`components/news/use-archive-search.ts`). Hook files start with `"use client"`.
