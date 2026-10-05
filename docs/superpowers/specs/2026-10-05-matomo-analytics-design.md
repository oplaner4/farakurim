# Anonymous visitor statistics with self-hosted Matomo

Date: 2026-10-05

## Goal

Anonymous visitor statistics for the parish website: page views, visits, referrers, devices and downloads (ohlášky,
Petrklíč and posters in `/uploads/`). **No cookies, no personal data, no consent banner**, and the data stays on the
parish's own hosting.

Success means: Matomo shows page views for client-side navigations as well as full page loads, PDF downloads show up
as downloads, the browser stores nothing for Matomo (no cookies, no localStorage), and builds without the Matomo
variables send nothing.

## Hosting (manual setup, outside this repo)

- **Matomo 5** (PHP + MySQL/MariaDB) on the existing cesky-hosting.cz account at **`https://statistiky.farakurim.cz`**,
  in its own web root (not inside `/2026.farakurim.cz/` or `/farakurim.cz/`).
- **HTTPS** with a Let's Encrypt certificate; `force_ssl = 1` in `config/config.ini.php`. HTTPS is required: an HTTP
  tracker is blocked as mixed content once the site runs on HTTPS, and the admin login must not travel in plain text.
- One MySQL/MariaDB database and user, created in the hosting administration (the plan includes it).
- Reports are archived when the dashboard is opened (browser-triggered archiving), enough for this traffic; no cron.
- Installed and updated by hand through Matomo's web installer and updater. Matomo's code is **not** in this repo.
- The deploy workflow and the `farnost-deploy` skill stay unchanged: Matomo lives outside the web root that rsync
  syncs, so no fourth exclude is needed.

The implementation plan includes a step-by-step checklist (in Czech or English, as the user prefers) for this setup.

### Privacy settings in Matomo

- _Anonymize visitor IP addresses_: on, **2 bytes** masked; _Also use the anonymized IP for enrichment_: yes.
- _Regularly delete old raw data_: on, **90 days**. Aggregated reports are kept.
- _Disable visits log and visitor profile_: on.
- No User ID, heatmaps, session recordings or other premium features.
- Own visits are excluded with an IP filter in the website settings, not with an opt-out cookie.

## Website changes (this repo)

### `MatomoTracker` (`src/components/layout/MatomoTracker.tsx`)

A client component rendered once in the root layout (`src/app/layout.tsx`), next to `<SiteFooter />`.

- Renders nothing and sends nothing unless both `NEXT_PUBLIC_MATOMO_URL` and `NEXT_PUBLIC_MATOMO_SITE_ID` are set.
- Sets up the `_paq` queue with `disableCookies`, `setTrackerUrl` (`<url>/matomo.php`), `setSiteId` and
  `enableLinkTracking`, then loads `<url>/matomo.js` asynchronously after hydration (`next/script` with
  `strategy="afterInteractive"` or an injected `<script async>`, whichever the Next 16 docs recommend for a static
  export).
- On the first render and on every App Router navigation (`usePathname`) it pushes `setReferrerUrl` (the previous
  URL), `setCustomUrl` (the new URL), `setDocumentTitle` (`document.title`) and `trackPageView`. Exactly one page view
  per navigation, none for hash changes (the lightbox uses the hash).
- The tracked URL is the **pathname only**: query parameters (filters, search) are left out so reports stay grouped by
  page.
- `enableLinkTracking` counts downloads of PDFs and other files, and clicks on external links, with no extra code.
- The title of a page changes after navigation; the page view is pushed after the new title is in place (in an effect
  after commit; if the title is still stale, defer one animation frame).

### Pure logic (`src/lib/shared/analytics.ts` + `analytics.test.ts`)

No React test library is installed, so the testable part lives in `lib`:

- `matomoConfig(url, siteId)`: returns `{ trackerUrl, scriptUrl, siteId }` or `undefined` when either value is missing
  or blank (trailing slash on the URL tolerated).
- `pageViewCommands(path, title, previousUrl)`: returns the `_paq` command arrays for one page view.

The component only wires these to `window._paq` and the router.

### Configuration

- `src/content/site.ts` exports `MATOMO_URL` and `MATOMO_SITE_ID` from the env variables, like
  `GOOGLE_CALENDAR_API_KEY`.
- `.github/workflows/build-and-deploy.yml`: the build step passes `NEXT_PUBLIC_MATOMO_URL: ${{ vars.MATOMO_URL }}` and
  `NEXT_PUBLIC_MATOMO_SITE_ID: ${{ vars.MATOMO_SITE_ID }}` (repository variables, as the build job has no
  environment). This is a build-step change only; the SSH target, rsync flags, excludes and verify checks shared with
  `farnost-deploy` are untouched.
- Local and dev builds don't track unless `.env.local` sets the variables.

### 404 page

`src/app/not-found.tsx` keeps its title; the tracker records it like any page, so broken old-site URLs appear in the
Pages report under the 404 title with their path.

### Privacy page `/ochrana-osobnich-udaju/`

A new minimal page (Czech), linked from the footer next to the existing links. Contents:

- Who runs the site (the parish, with the contact from `site.ts`).
- **Statistics:** anonymous Matomo on the parish's own server, no cookies, IP addresses shortened, raw data deleted
  after 90 days, no data passed to third parties.
- **Stored in the browser:** only the chosen colour theme (`localStorage`, key `theme`), not for tracking.
- **Third parties the browser contacts:** Google (the calendars load events from the Google Calendar API), Zonerama
  (album photos), Mapy.com (the map on Kontakty) and YouTube (`youtube-nocookie.com`, only after a video is clicked).
  These see the visitor's IP address like any web server; the page says so plainly.
- Built from the existing page parts (`PageHeading`, header and footer); added to `sitemap.ts`. If the route appears
  in `planned-pages.ts`, it is removed from there.

### Documentation

- `README.md`: the Matomo subdomain and the two env variables (Requirements and Deployment sections).
- `CLAUDE.md`: one line under "Stack and the static-export constraint" naming the tracker and its env variables.

## Out of scope

- A same-origin tracker proxy against ad blockers (add only if the numbers look too low).
- Custom events (lightbox opens, calendar clicks, copy buttons).
- A consent banner (not needed with this configuration).
- Moving Matomo when the site moves from `2026.farakurim.cz` to `farakurim.cz`: the tracker keeps working; only the
  site's URL in Matomo's website settings is updated.

## Testing

- `analytics.test.ts`: config is `undefined` without either variable; URLs are built correctly with and without a
  trailing slash; page-view commands contain the pathname without query, the title and the previous URL.
- Browser check (390, 834, 1440 px for the privacy page; tracker at one width) with the variables set against the real
  Matomo instance: one `matomo.php` request per navigation, a download request for a PDF link, no cookies or Matomo
  keys in storage, and the visits in Matomo's real-time widget (the visits log is off, so use _Visitors → Real-time
  map_ / the dashboard counter).
- A build without the variables contains no request to `statistiky.farakurim.cz`.
- The usual `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`.
