# Matomo Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count anonymous, cookieless page views and downloads on the parish site with a self-hosted Matomo at
`https://statistiky.farakurim.cz`, and publish a privacy page that says so.

**Architecture:** Pure command builders in `src/lib/shared/analytics.ts` (unit-tested) feed a small client component
`MatomoTracker` in the root layout, which queues Matomo commands in `window._paq`, loads `matomo.js` with
`next/script`, and pushes one page view per App Router navigation. The tracker is off unless two `NEXT_PUBLIC_MATOMO_*`
variables are set at build time. Matomo itself is installed by hand on the hosting (Task 0), outside this repo.

**Tech Stack:** Next.js 16 App Router (static export), React 19, TypeScript, Vitest, Tailwind v4, Matomo 5 JS tracker.

**Spec:** `docs/superpowers/specs/2026-10-05-matomo-analytics-design.md`

## Global Constraints

- Static export only (`output: "export"`): no route handlers, middleware, rewrites or headers; check
  `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` before using a Next feature.
- The tracker never sets cookies or writes storage: `disableCookies` is the first command in `_paq`.
- Tracked URL = `location.origin + pathname`, **no query string, no hash**; hash changes are not page views.
- No tracking unless both `NEXT_PUBLIC_MATOMO_URL` and `NEXT_PUBLIC_MATOMO_SITE_ID` are non-blank.
- Matomo URL: `https://statistiky.farakurim.cz`, its own web root; the rsync excludes, SSH target and verify checks
  shared by `.github/workflows/build-and-deploy.yml` and the `farnost-deploy` skill stay unchanged.
- Raw data retention 90 days, IP anonymized by 2 bytes.
- UI copy in Czech; code, comments, file names and commit messages in English.
- Commits: Conventional Commits via the `commit` skill; never `--no-verify`. pnpm only.
- Imports: same folder `./x`, otherwise `@/…`; `lib` never imports content data (only `@/content/site` URLs/types).
- Done = `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`, plus a browser check at 390,
  834 and 1440 px (`.claude/rules/design-check.md`).

## Review Focus

1. **React StrictMode / dev double effects:** in `pnpm dev` effects mount twice; a reasonable person expects one page
   view per navigation, not two. Owned by Task 2 (cleanup cancels the scheduled frame; verified in Step 2.7).
2. **Query-only navigations** (Aktuality filters via nuqs change `?…` but not the pathname): no new page view,
   because the URL Matomo would record is identical. Owned by Task 1 (`trackedUrl` test) and Task 2 (effect depends
   on `pathname` only).
3. **Blank or whitespace env values** (a repository variable that exists but is empty, as GitHub passes `""`):
   tracking stays off, no request to `undefined/matomo.js`. Owned by Task 1 (`matomoConfig` tests).
4. **URL with trailing slash or path** (`https://statistiky.farakurim.cz/`): must not produce `//matomo.php`.
   Owned by Task 1.
5. **Stale document title** on client navigation (title of the previous page recorded for the new one). Owned by
   Task 2: page view is pushed in `requestAnimationFrame` after commit; verified in Step 2.7 by reading the
   `action_name` query parameter of the `matomo.php` request.

---

### Task 0: Set up Matomo on the hosting (done by the user, not an agent)

This produces the URL and the **site ID** that Tasks 2 and 4 need. Tasks 1–3 can be built before it is done.

- [ ] **Step 0.1:** In the cesky-hosting.cz administration, create the subdomain `statistiky.farakurim.cz` with its
      own folder (e.g. `/statistiky.farakurim.cz/`), **not** inside `/2026.farakurim.cz/` or `/farakurim.cz/`.
- [ ] **Step 0.2:** Turn on a Let's Encrypt certificate for the subdomain; check that
      `https://statistiky.farakurim.cz/` loads without a warning.
- [ ] **Step 0.3:** Create a MySQL/MariaDB database and a user with all privileges on it; note host, database name,
      user and password.
- [ ] **Step 0.4:** Download the latest Matomo 5 from https://matomo.org/download/, unzip it and upload the
      **contents** of the `matomo/` folder to the subdomain's folder (SFTP).
- [ ] **Step 0.5:** Open `https://statistiky.farakurim.cz/` and go through the installer: system check (fix any
      red item, e.g. missing PHP extensions, in the hosting's PHP settings), database details from 0.3, table prefix
      `matomo_`, a super user with a long unique password, first website:
  - Name `Farnost Kuřim`, URL `https://2026.farakurim.cz` (add `https://farakurim.cz` and `http://2026.farakurim.cz`
    as alias URLs), time zone `Europe/Prague`, not an e-shop.
  - Skip the tracking code page (the site has its own tracker). **Note the site ID** (usually `1`).
- [ ] **Step 0.6:** In `config/config.ini.php` on the server, under `[General]`, add `force_ssl = 1`.
- [ ] **Step 0.7:** _Administration → Privacy → Anonymize data_: anonymize visitor IP addresses **on**, mask
      **2 bytes**, _also use the anonymized IP addresses when enriching visits_ **yes**. Save.
- [ ] **Step 0.8:** _Administration → Privacy → Anonymize data → Regularly delete old raw data_: **on**, older than
      **90 days**. Leave _delete old aggregated report data_ off. Save.
- [ ] **Step 0.9:** _Administration → System → General settings_: _Archive reports when viewed from the browser_
      **yes**. _Administration → Websites → Manage → Farnost Kuřim_: excluded parameters — none needed; excluded IPs —
      add your home/parish IPs if you want to skip your own visits.
- [ ] **Step 0.10:** _Administration → System → General settings_, section _Live_: "Disable visits log & visitor
      profile" **on**.
- [ ] **Step 0.11:** In GitHub → repository → _Settings → Secrets and variables → Actions → Variables_, add
      repository variables `MATOMO_URL` = `https://statistiky.farakurim.cz` and `MATOMO_SITE_ID` = the ID from 0.5.

---

### Task 1: Matomo command builders (pure logic)

**Files:**

- Create: `src/lib/shared/analytics.ts`
- Test: `src/lib/shared/analytics.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type MatomoCommand = [string, ...unknown[]]`
  - `type MatomoConfig = { trackerUrl: string; scriptUrl: string; siteId: string }`
  - `matomoConfig(url: string | undefined, siteId: string | undefined): MatomoConfig | undefined`
  - `setupCommands(config: MatomoConfig): MatomoCommand[]`
  - `trackedUrl(origin: string, pathname: string): string`
  - `pageViewCommands(url: string, title: string, referrer: string | undefined): MatomoCommand[]`

- [ ] **Step 1.1: Write the failing tests**

`src/lib/shared/analytics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matomoConfig, pageViewCommands, setupCommands, trackedUrl } from "./analytics";

describe("matomoConfig", () => {
  it("builds the tracker and script URLs", () => {
    expect(matomoConfig("https://statistiky.farakurim.cz", "1")).toEqual({
      trackerUrl: "https://statistiky.farakurim.cz/matomo.php",
      scriptUrl: "https://statistiky.farakurim.cz/matomo.js",
      siteId: "1",
    });
  });

  it("tolerates trailing slashes and surrounding spaces", () => {
    expect(matomoConfig(" https://statistiky.farakurim.cz// ", " 3 ")).toEqual({
      trackerUrl: "https://statistiky.farakurim.cz/matomo.php",
      scriptUrl: "https://statistiky.farakurim.cz/matomo.js",
      siteId: "3",
    });
  });

  it("is off when either value is missing or blank", () => {
    expect(matomoConfig(undefined, "1")).toBeUndefined();
    expect(matomoConfig("https://statistiky.farakurim.cz", undefined)).toBeUndefined();
    expect(matomoConfig("", "1")).toBeUndefined();
    expect(matomoConfig("https://statistiky.farakurim.cz", "  ")).toBeUndefined();
  });
});

describe("setupCommands", () => {
  it("disables cookies before anything else", () => {
    const commands = setupCommands(matomoConfig("https://statistiky.farakurim.cz", "1")!);
    expect(commands[0]).toEqual(["disableCookies"]);
    expect(commands).toEqual([
      ["disableCookies"],
      ["setTrackerUrl", "https://statistiky.farakurim.cz/matomo.php"],
      ["setSiteId", "1"],
    ]);
  });
});

describe("trackedUrl", () => {
  it("joins the origin and the pathname", () => {
    expect(trackedUrl("https://2026.farakurim.cz", "/aktuality/")).toBe("https://2026.farakurim.cz/aktuality/");
  });

  it("drops a query string or hash that slipped into the pathname", () => {
    expect(trackedUrl("https://farakurim.cz", "/aktuality/?obdobi=tyden")).toBe("https://farakurim.cz/aktuality/");
    expect(trackedUrl("https://farakurim.cz", "/fotogalerie/#foto-3")).toBe("https://farakurim.cz/fotogalerie/");
  });
});

describe("pageViewCommands", () => {
  it("sets the referrer, URL and title, tracks the view and re-scans links", () => {
    expect(pageViewCommands("https://farakurim.cz/kontakty/", "Kontakty | Farnost", "https://farakurim.cz/")).toEqual([
      ["setReferrerUrl", "https://farakurim.cz/"],
      ["setCustomUrl", "https://farakurim.cz/kontakty/"],
      ["setDocumentTitle", "Kontakty | Farnost"],
      ["trackPageView"],
      ["enableLinkTracking"],
    ]);
  });

  it("leaves the browser's referrer alone on the first page", () => {
    expect(pageViewCommands("https://farakurim.cz/", "Úvod", undefined)[0]).toEqual([
      "setCustomUrl",
      "https://farakurim.cz/",
    ]);
  });
});
```

- [ ] **Step 1.2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lib/shared/analytics.test.ts`
Expected: FAIL, `Failed to resolve import "./analytics"`.

- [ ] **Step 1.3: Implement**

`src/lib/shared/analytics.ts`:

```ts
/**
 * Commands for the Matomo JavaScript tracker (`window._paq`), self-hosted at statistiky.farakurim.cz. Cookieless:
 * `disableCookies` comes first, so the tracker never writes cookies or storage. Pages are recorded by pathname only.
 */

export type MatomoCommand = [string, ...unknown[]];

export type MatomoConfig = { trackerUrl: string; scriptUrl: string; siteId: string };

/** The tracker's endpoints, or `undefined` (tracking off) when the URL or the site ID is missing or blank. */
export function matomoConfig(url: string | undefined, siteId: string | undefined): MatomoConfig | undefined {
  const base = url?.trim().replace(/\/+$/, "");
  const id = siteId?.trim();
  if (!base || !id) return undefined;
  return { trackerUrl: `${base}/matomo.php`, scriptUrl: `${base}/matomo.js`, siteId: id };
}

/** Queued once, before the first page view. */
export function setupCommands(config: MatomoConfig): MatomoCommand[] {
  return [["disableCookies"], ["setTrackerUrl", config.trackerUrl], ["setSiteId", config.siteId]];
}

/** The URL Matomo records for a page: no query string (filters, search) and no hash (the lightbox). */
export function trackedUrl(origin: string, pathname: string): string {
  return origin + pathname.replace(/[?#].*$/, "");
}

/**
 * One page view. `referrer` is the previous page's tracked URL on client-side navigations, `undefined` on the first
 * page (Matomo then reads `document.referrer`). `enableLinkTracking` again picks up the new page's download and
 * outlink links, as Matomo's SPA guide recommends.
 */
export function pageViewCommands(url: string, title: string, referrer: string | undefined): MatomoCommand[] {
  return [
    ...(referrer ? [["setReferrerUrl", referrer] as MatomoCommand] : []),
    ["setCustomUrl", url],
    ["setDocumentTitle", title],
    ["trackPageView"],
    ["enableLinkTracking"],
  ];
}
```

- [ ] **Step 1.4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/shared/analytics.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/shared/analytics.ts src/lib/shared/analytics.test.ts
git commit -m "feat(analytics): add cookieless Matomo command builders"
```

(Use the `commit` skill; it adds the attribution trailer.)

---

### Task 2: `MatomoTracker` in the root layout

**Files:**

- Modify: `src/content/site.ts` (after `GOOGLE_CALENDAR_API_KEY`, around line 124)
- Create: `src/components/layout/MatomoTracker.tsx`
- Modify: `src/app/layout.tsx` (render `<MatomoTracker />` after `<SiteFooter />`)
- Modify: `.env.local.example`

**Interfaces:**

- Consumes: `matomoConfig`, `setupCommands`, `trackedUrl`, `pageViewCommands`, `MatomoCommand` from
  `@/lib/shared/analytics` (Task 1).
- Produces: `MATOMO_URL: string | undefined` and `MATOMO_SITE_ID: string | undefined` exported from
  `@/content/site`; component `MatomoTracker()` (no props) from `@/components/layout/MatomoTracker`.

- [ ] **Step 2.1: Add the config constants** to `src/content/site.ts`, directly below `GOOGLE_CALENDAR_API_KEY`:

```ts
/**
 * The self-hosted Matomo (`https://statistiky.farakurim.cz`) and the site's ID in it. Without both, no statistics
 * are collected (local and dev builds). Public in the built JS, like the calendar key.
 */
export const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL || undefined;
export const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID || undefined;
```

- [ ] **Step 2.2: Create the component** `src/components/layout/MatomoTracker.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { MATOMO_SITE_ID, MATOMO_URL } from "@/content/site";
import { type MatomoCommand, matomoConfig, pageViewCommands, setupCommands, trackedUrl } from "@/lib/shared/analytics";

declare global {
  interface Window {
    _paq?: MatomoCommand[];
  }
}

const config = matomoConfig(MATOMO_URL, MATOMO_SITE_ID);

/**
 * Anonymous, cookieless statistics (Matomo on statistiky.farakurim.cz): one page view per App Router navigation,
 * downloads and outlinks through link tracking. Renders nothing when the Matomo variables are not set.
 */
export function MatomoTracker() {
  const pathname = usePathname();
  const previousUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!config) return;
    // After the commit, so document.title is the new page's; cancelled on cleanup, so StrictMode's second run in
    // dev does not count the page twice.
    const frame = requestAnimationFrame(() => {
      const paq = (window._paq ??= []);
      if (previousUrl.current === undefined) paq.push(...setupCommands(config));
      const url = trackedUrl(window.location.origin, pathname);
      paq.push(...pageViewCommands(url, document.title, previousUrl.current));
      previousUrl.current = url;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return config ? <Script src={config.scriptUrl} strategy="afterInteractive" /> : null;
}
```

Notes for the implementer: the queue works whether `matomo.js` has loaded or not (Matomo replays `_paq` on load,
then replaces `push`). The effect depends on `pathname` only, so query-only navigations (Aktuality filters) do not
count as new views. If `@/lib/shared/analytics` named-type import order fails `pnpm lint`, follow the linter.

- [ ] **Step 2.3: Render it in the root layout.** In `src/app/layout.tsx` add the import
      `import { MatomoTracker } from "@/components/layout/MatomoTracker";` (alphabetically, before `QueryProvider`)
      and change:

```tsx
            <NuqsAdapter>{children}</NuqsAdapter>
            <SiteFooter />
```

to:

```tsx
            <NuqsAdapter>{children}</NuqsAdapter>
            <SiteFooter />
            <MatomoTracker />
```

- [ ] **Step 2.4: Document the local variables** — append to `.env.local.example`:

```sh

# Anonymous statistics (self-hosted Matomo, no cookies). Leave empty locally so development visits are not counted;
# set both to test the tracker against the real instance.
NEXT_PUBLIC_MATOMO_URL=
NEXT_PUBLIC_MATOMO_SITE_ID=
```

- [ ] **Step 2.5: Check that a build without the variables does not track**

Run: `pnpm build` (with no `NEXT_PUBLIC_MATOMO_*` in `.env.local`), then
`grep -rl "statistiky.farakurim.cz" out/ || echo "no tracker"`
Expected: `no tracker`. (The URL lives only in the env variable, so it must not appear anywhere in `out/`.)

- [ ] **Step 2.6: Check with the variables set** (needs Task 0; otherwise use any HTTPS URL and only inspect the
      requests). Put `NEXT_PUBLIC_MATOMO_URL=https://statistiky.farakurim.cz` and
      `NEXT_PUBLIC_MATOMO_SITE_ID=<id>` in `.env.local`, run `pnpm build && pnpm preview`.

- [ ] **Step 2.7: Verify in the browser** (Claude in Chrome or Playwright, network panel filtered to `matomo`):
  - First load of `/`: one `matomo.js` and one `matomo.php` request; `action_name` = the home page title, `url` = the
    page URL without query.
  - Click to _Kontakty_: exactly one new `matomo.php` with `action_name` containing "Kontakty" (not the home title)
    and `urlref` = the home URL.
  - On _Aktuality_, change a filter (query changes): **no** new `matomo.php`.
  - Open a photo in the lightbox (hash changes): **no** new `matomo.php`.
  - Click a `/uploads/…pdf` link (Pořad bohoslužeb): a `matomo.php` request with `download=`.
  - `document.cookie` has no `_pk_` entries; `localStorage` / `sessionStorage` have no Matomo keys.
  - Open a missing URL such as `/neexistuje/`: one `matomo.php` with `action_name` containing "Stránka nenalezena".
  - In `pnpm dev` (StrictMode): first load still sends exactly one page view.
  - With Task 0 done: the visit shows in Matomo's _Real-time_ dashboard widget.

  Then remove the variables from `.env.local` again.

- [ ] **Step 2.8: Run the checks and commit**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: all pass.

```bash
git add src/content/site.ts src/components/layout/MatomoTracker.tsx src/app/layout.tsx .env.local.example
git commit -m "feat(analytics): track anonymous page views with self-hosted Matomo"
```

---

### Task 3: Privacy page `/ochrana-osobnich-udaju/`

**Files:**

- Modify: `src/content/site.ts` (`links`)
- Create: `src/app/ochrana-osobnich-udaju/page.tsx`
- Modify: `src/components/layout/SiteFooter.tsx` (bottom row)
- Modify: `src/app/sitemap.ts`

**Interfaces:**

- Consumes: `links`, `parish`, `contacts` from `@/content/site`; `SiteHeader`, `PageHeading`, `SectionHeading`.
- Produces: `links.privacy = "/ochrana-osobnich-udaju/"`.

- [ ] **Step 3.1: Add the route** to `links` in `src/content/site.ts`, after `webLinks`:

```ts
  webLinks: "/odkazy/",
  privacy: "/ochrana-osobnich-udaju/",
```

- [ ] **Step 3.2: Create the page** `src/app/ochrana-osobnich-udaju/page.tsx` (check `SectionHeading`'s props in
      `src/components/ui/SectionHeading.tsx` first and pass what it requires):

```tsx
import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { contacts, links, parish } from "@/content/site";

const lead = "Jak web farnosti zachází s údaji návštěvníků.";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  description: `${lead} Anonymní statistika návštěvnosti bez cookies na vlastním serveru farnosti.`,
};

/** Privacy page (no mockup yet): statistics, browser storage and the third-party services the site loads. */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader currentHref={links.privacy} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Ochrana osobních údajů" color="blue" size="standard" intro={lead} />

        <section aria-labelledby="provozovatel" className="flex max-w-prose flex-col gap-3">
          <SectionHeading id="provozovatel" title="Kdo web provozuje" color="blue" />
          <p>
            Web provozuje {parish.name}, {contacts.street}, {contacts.postalCode} {contacts.town}. Dotazy k ochraně
            údajů posílejte na <a href={`mailto:${contacts.email}`}>{contacts.email}</a>.
          </p>
        </section>

        <section aria-labelledby="statistika" className="flex max-w-prose flex-col gap-3">
          <SectionHeading id="statistika" title="Statistika návštěvnosti" color="blue" />
          <p>
            Abychom věděli, které stránky čtete a co stahujete, počítáme návštěvy nástrojem Matomo. Běží na serveru
            farnosti, data nikomu nepředáváme.
          </p>
          <ul className="rich-text">
            <li>Nepoužívá cookies ani jiné ukládání ve vašem prohlížeči.</li>
            <li>IP adresy zkracujeme, takže z nich nelze poznat konkrétního člověka.</li>
            <li>Podrobné záznamy o návštěvách po 90 dnech mažeme, ponecháváme jen souhrnná čísla.</li>
          </ul>
        </section>

        <section aria-labelledby="prohlizec" className="flex max-w-prose flex-col gap-3">
          <SectionHeading id="prohlizec" title="Co se ukládá ve vašem prohlížeči" color="blue" />
          <p>
            Jen zvolený barevný režim (světlý nebo tmavý), aby zůstal stejný i při další návštěvě. Nikam se neodesílá.
          </p>
        </section>

        <section aria-labelledby="sluzby" className="flex max-w-prose flex-col gap-3">
          <SectionHeading id="sluzby" title="Obsah z jiných služeb" color="blue" />
          <p>
            Některé části stránek načítá váš prohlížeč přímo z jiných služeb. Ty proto uvidí vaši IP adresu, stejně jako
            kterýkoli jiný web, který navštívíte:
          </p>
          <ul className="rich-text">
            <li>
              <strong>Google</strong> – události v kalendářích (Google Kalendář),
            </li>
            <li>
              <strong>Zonerama</strong> – fotografie ve Fotogalerii,
            </li>
            <li>
              <strong>Mapy.com</strong> – mapa na stránce Kontakty,
            </li>
            <li>
              <strong>YouTube</strong> – videa, a to až když je spustíte.
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
```

If `SectionHeading` renders its own `<section>` wrapper or its `id` is the heading's id, adapt the wrappers so ids are
unique and each `aria-labelledby` points at a heading. Headings must stay in order (`h1` from `PageHeading`, then
`h2`) per `.claude/rules/accessibility.md`.

- [ ] **Step 3.3: Link it from the footer.** In `src/components/layout/SiteFooter.tsx`, replace the single contacts
      link in the bottom row:

```tsx
<a href={links.contacts} className="text-inherit hover:text-inherit">
  Kontakty a úřední hodiny
</a>
```

with:

```tsx
<span className="flex flex-wrap gap-x-6 gap-y-1.5">
  <a href={links.privacy} className="text-inherit hover:text-inherit">
    Ochrana osobních údajů
  </a>
  <a href={links.contacts} className="text-inherit hover:text-inherit">
    Kontakty a úřední hodiny
  </a>
</span>
```

Check the touch-target rule in `.claude/rules/accessibility.md`; if footer links need a minimum height, apply the same
classes the rest of the footer uses.

- [ ] **Step 3.4: Add it to the sitemap.** In `src/app/sitemap.ts`, after `links.webLinks,` add `links.privacy,`.

- [ ] **Step 3.5: Check it builds and the page exists**

Run: `pnpm build && ls out/ochrana-osobnich-udaju/index.html && grep -c "ochrana-osobnich-udaju" out/sitemap.xml`
Expected: the file is listed and the count is `1`.

- [ ] **Step 3.6: Browser check** at 390, 834 and 1440 px, light and dark theme (`.claude/rules/design-check.md`):
      the page reads like Odkazy (same heading, gutters, text width), the lists have bullets, the footer bottom row
      wraps cleanly at 390 px with both links, and the e-mail link works.

- [ ] **Step 3.7: Run the checks and commit**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`

```bash
git add src/content/site.ts src/app/ochrana-osobnich-udaju/page.tsx src/components/layout/SiteFooter.tsx src/app/sitemap.ts
git commit -m "feat(privacy): add the privacy page and link it from the footer"
```

---

### Task 4: CI variables and documentation

**Files:**

- Modify: `.github/workflows/build-and-deploy.yml` (the `pnpm build` step's `env`, around line 81)
- Modify: `README.md` (Getting started, after "### Google Calendar (optional)"; Deployment, the variables sentence)
- Modify: `CLAUDE.md` ("Stack and the static-export constraint")

**Interfaces:**

- Consumes: repository variables `MATOMO_URL`, `MATOMO_SITE_ID` (Task 0.11); env names from Task 2.
- Produces: production builds with tracking on.

- [ ] **Step 4.1: Pass the variables to the build.** In `.github/workflows/build-and-deploy.yml`, extend the build
      step's `env`:

```yaml
- run: pnpm build
  env:
    # Without the key the calendars ship mock data. A repository variable: the key is public in the built JS,
    # and this job has no environment, so it could not read the Production environment's values.
    NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: ${{ vars.GOOGLE_CALENDAR_API_KEY }}
    # Anonymous statistics (Matomo on statistiky.farakurim.cz); without both the site does not track.
    NEXT_PUBLIC_MATOMO_URL: ${{ vars.MATOMO_URL }}
    NEXT_PUBLIC_MATOMO_SITE_ID: ${{ vars.MATOMO_SITE_ID }}
```

Only this step changes; the deploy job (SSH target, rsync flags, excludes, verify checks) is untouched, so the
`farnost-deploy` skill needs no change.

- [ ] **Step 4.2: README, Getting started.** After the Google Calendar subsection (before `### "Slovo na dnešek"`),
      add:

```markdown
### Statistics (optional)

The site counts anonymous visits with a self-hosted [Matomo](https://matomo.org/) at
`https://statistiky.farakurim.cz` (its own web root on the hosting, installed and updated by hand, not in this repo).
The tracker sets no cookies and stores nothing in the browser; Matomo shortens IP addresses and deletes raw visits
after 90 days. It is on only when `NEXT_PUBLIC_MATOMO_URL` and `NEXT_PUBLIC_MATOMO_SITE_ID` are set, so local builds
don't track; set both in `.env.local` to test it. The privacy page (`/ochrana-osobnich-udaju/`) describes it and the
third-party services the site loads: update it when that list changes.
```

- [ ] **Step 4.3: README, Deployment.** Change "and the repository variable `GOOGLE_CALENDAR_API_KEY` (the build job
      has no environment)" to "and the repository variables `GOOGLE_CALENDAR_API_KEY`, `MATOMO_URL` and
      `MATOMO_SITE_ID` (the build job has no environment)".

- [ ] **Step 4.4: CLAUDE.md.** After the `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` bullet in "Stack and the static-export
      constraint", add:

```markdown
- `NEXT_PUBLIC_MATOMO_URL` and `NEXT_PUBLIC_MATOMO_SITE_ID` switch on the cookieless Matomo tracker
  (`MatomoTracker`, Matomo itself lives on `statistiky.farakurim.cz`, outside this repo). Keep it cookieless, and
  update the privacy page when the site starts loading a new third-party service.
```

- [ ] **Step 4.5: Run the checks and commit**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`

```bash
git add .github/workflows/build-and-deploy.yml README.md CLAUDE.md
git commit -m "ci(analytics): pass the Matomo variables to the build and document them"
```

---

### After the tasks

Releasing (a `vX.Y.Z` tag via the `farnost-deploy` skill) publishes the site and turns tracking on in production. That
needs the user's explicit yes and Task 0 done (variables set). After the release, open `https://2026.farakurim.cz/`
and confirm the visit in Matomo's Real-time widget.
