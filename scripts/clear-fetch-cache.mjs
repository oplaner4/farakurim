// Runs before `next build` (pnpm build): deletes Next's fetch cache, so every build reads the parish calendars
// and the day's verse afresh. `next build` keeps a fetch made while prerendering in .next/cache/fetch-cache and
// reuses it in later builds indefinitely, and a static export cannot opt out per request (`cache: "no-store"` makes
// the route dynamic, which fails the export). The cache holds only these build-time fetches; Next's other caches
// in .next/cache stay.

import { rmSync } from "node:fs";

rmSync(new URL("../.next/cache/fetch-cache", import.meta.url), { recursive: true, force: true });
