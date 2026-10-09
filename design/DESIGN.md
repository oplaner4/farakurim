# farakurim.cz – redesign (handoff)

Spec for implementing the new website of **Římskokatolická farnost Kuřim**.
Pages designed so far: **homepage** (sections 1–10), **Aktuality** (section 11),
**Archiv aktualit** (section 12), **Detail akce** (section 13), **Pořad bohoslužeb**
(section 14), **Kontakty** (section 15), **Kalendář** (section 16, plus the
homepage week calendar in 4.3a), **Petrklíč** (section 17), **Archiv Petrklíče**
(section 18) **Fotogalerie** (section 19, plus the homepage carousel in 4.5), and the **"Více" menu and sitemap footer** shared by every page (section 20).
More pages will follow. Language of all UI copy: **Czech**. Approach: **mobile-first**.
Every page has a **light and a dark theme**.

## Contents of this folder

| Path | What it is |
|---|---|
| `DESIGN.md` | This spec, the source of truth for implementation |
| `mockups/home/light/` | Homepage: `mobile-390`, `tablet-834`, `desktop-1440` |
| `mockups/home/dark/` | Homepage in the dark theme (section 10) |
| `mockups/aktuality/light/` | Aktuality page, same three sizes (section 11) |
| `mockups/aktuality/dark/` | Aktuality page in the dark theme |
| `mockups/archiv/{light,dark}/` | Archiv aktualit (section 12) |
| `mockups/detail/{light,dark}/` | Detail akce, example: the jubilee mass (section 13) |
| `mockups/porad-bohosluzeb/{light,dark}/` | Pořad bohoslužeb (section 14) |
| `mockups/kontakty/{light,dark}/` | Kontakty (section 15) |
| `mockups/kalendar/{light,dark}/` | Kalendář (section 16) |
| `mockups/petrklic/{light,dark}/` | Petrklíč – aktuální číslo (section 17) |
| `mockups/petrklic-archiv/{light,dark}/` | Archiv Petrklíče (section 18) |
| `mockups/fotogalerie/{light,dark}/` | Fotogalerie (section 19) |
| `mockups/lightbox-foto/{light,dark}/`, `mockups/lightbox-plakat/{light,dark}/` | The lightbox, open, for a photo and for a poster (section 21) |
| `mockups/financni-podpora/{light,dark}/` | Finanční podpora (section 22) |
| `mockups/odkazy/{light,dark}/` | Odkazy (section 23) |
| `mockups/vyuka-nabozenstvi/`, `mockups/aktivity/`, `mockups/kronika/`, `mockups/skupina-schola/`, `mockups/financni-podpora-starsi/` (each `{light,dark}`) | Sections 24–28 |
| `mockups/skupina-chramovy-sbor/`, `mockups/skupina-spolecenstvi-mladeze/`, `mockups/skupina-katecheze/` | More pages from the group template (27.1) |
| `mockups/menu/{light,dark}/` | Homepage with the "Více" menu open (section 20) |
| `assets/logo-farnost-kurim.svg` | Cleaned logo (also the future favicon) |

Desktop mockups are fluid with content max-width 1200 px; mobile and tablet are
drawn at a fixed 390 / 834 px.

**About the mockups:** they are design-tool sources (`.dc.html`), **not runnable pages**.
`<x-dc>`, `<sc-if>`, `<sc-for>`, `{{holes}}` and the `class Component extends DCLogic`
script are the design tool's templating. Read them for exact values (sizes,
colours, spacing, copy) and for the logic in the script blocks (countdown,
carousel, Aktuality filters). Do **not** copy their structure: they use inline
styles everywhere and are separate files per size and theme. Production should be
**one template per page + one shared stylesheet**, with header and footer as
shared partials. Internal links in the mockups already use the real routes
(`/`, `/aktuality/`, `/aktuality/archiv`, and `/aktuality/slavnostni-mse-k-jubileu-800-let`
as an example detail URL, `/porad_bohosluzeb`, `/kontakty`, `/kalendar`, `/petrklic/aktualni`, `/petrklic/archiv`, `/fotogalerie`); the theme toggle's `href="#"` stands for the JS toggle.

---

## 1. Design direction

Bright, happy and welcoming, built directly from the logo: four saturated colours on
a clean white background, with **angled "shard" shapes** borrowed from the logo's
facets. No dark or sad tones, no gradients, no emoji.

Each colour belongs to a section, consistently:

| Colour | Section |
|---|---|
| Blue | Next mass, Pořad bohoslužeb, Kontakty, primary actions |
| Magenta | Aktuality |
| Green | Fotogalerie |
| Orange | Petrklíč |

## 2. Tokens

### Colours

```css
:root {
  /* Brand (from logo) */
  --blue:    #1D71B7;  /* white text OK on it */
  --green:   #2EAC66;  /* decorative only, NOT for text / white-text fills */
  --magenta: #D60B51;  /* white text OK on it */
  --orange:  #F39200;  /* dark text (#1B2533) on it, never white */

  /* Text-safe shades (≥4.5:1 on white) for links and labels */
  --blue-ink:    #165A93;  /* hover #0F3F69 */
  --green-ink:   #17784A;
  --magenta-ink: #B0083F;
  --orange-ink:  #A85800;  /* deeper #8A4B00 on orange tint */

  /* Tints (card / section backgrounds, photo placeholders) */
  --blue-tint:    #EAF3FB;  /* alt #DCEBF8, divider on tint #D3E4F3 */
  --green-tint:   #DDF2E5;
  --magenta-tint: #FDEEF3;  /* alt #FBE0EA */
  --orange-tint:  #FFF3E0;  /* alt #FFEBCC */

  /* Neutrals */
  --ink:     #1B2533;  /* body text */
  --ink-2:   #3A4656;  /* secondary text */
  --muted:   #556070;  /* captions, meta; still ≥4.5:1 */
  --line:    #E6EAF0;
  --surface: #F4F6F9;  /* neutral cards, footer */
  --bg:      #FFFFFF;
  --dot-off: #C9D6E3;  /* inactive carousel dot */
}
```

### Typography

- Family: **Oxygen** 300 / 400 / 700 (self-host woff2, `font-display: swap`).
  Fallback stack: `'Segoe UI', 'Helvetica Neue', sans-serif`.
- Body line-height 1.5 (desktop 1.55).

| Role | Mobile | Tablet | Desktop |
|---|---|---|---|
| Body | 16 | 17 | 17 |
| Section H2 | 26 / 700 | 32 / 700 | 40 / 700, -0.015em |
| Card title | 17 / 700 | 18 / 700 | 20 / 700 |
| Next-mass time | 64 / 700, -0.03em | 76 | 84 |
| Countdown number | 28 / 700 | 34 | 30 |
| Eyebrow label (uppercase, +0.06em) | 13–14 / 700 | same | same |
| Meta / captions | 13–14 | 14–15 | 14–15 |

### Shape, spacing, depth

- Radii: buttons 14, small blocks 12–16, cards 18–24, big panels 24 (mobile) / 28 (tablet) / 32 (desktop), pills 999.
- Page side padding: 16 (mobile) / 32 (tablet, desktop). Desktop container max-width 1200 + 2×32.
- Section spacing: 40–48 (mobile), 56 (tablet), 80 (desktop).
- Shadow (next-mass card only): `0 12px 32px rgba(29,113,183,.16)`, larger on bigger screens.
- Touch targets ≥ 44 px; primary buttons 52 px tall.

### Breakpoints (mobile-first)

```css
/* base = mobile (≤ 767) */
@media (min-width: 768px)  { /* tablet  */ }
@media (min-width: 1200px) { /* desktop */ }
```

## 3. Signature elements

1. **Colour stripe:** a 6 px band of four segments, flex ratios 3 : 2 : 2 : 3
   (green, blue, magenta, orange). Sits under the header and on top of the footer.
2. **Shards:** decorative right triangles made with `clip-path` on `aria-hidden` spans:
   - Section heading marker: 16×22 (mobile) to 22×32 (desktop), `polygon(0 100%, 100% 0, 100% 100%)`, in the section colour, left of the H2.
   - Next-mass card: two overlapping triangles in the top-right corner (blue plus green on mobile/tablet, blue plus magenta on desktop), `polygon(0 0, 100% 0, 100% 100%)`.
   - Petrklíč panel: an orange triangle in a bottom corner.
   - Desktop carousel: green and orange triangles in the top-left corner.

## 4. Homepage structure

Order is the same at every breakpoint. Differences per breakpoint are noted.

### 4.1 Header
- Logo (`assets/logo-farnost-kurim.svg`, ratio 421:681) with a two-line brand: small "Římskokatolická farnost" (muted) over a large bold **"Kuřim"**.
- **Mobile:** a hamburger button (48×48, blue tint) opens a vertical menu under the stripe.
- **Tablet:** a blue **"Ohlášky"** button (downloads this week's PDF) plus the hamburger; the menu opens as a 3-column grid of pills.
- **Desktop:** an inline nav (Úvod · Aktuality · Bohoslužby · Fotogalerie · Petrklíč · Kontakty), the current page as a blue-tint pill with `aria-current="page"`, and a blue **"Ohlášky"** button with a file-download icon (it downloads this week's ohlášky PDF). Nav items use `padding: 0 12px`. Kalendář is **not** a menu item: it is reached from the homepage week calendar, the Bohoslužby page and in-page links.

### 4.2 Hero carousel
- 7 photos, **different file per breakpoint**: `/assets/img/pozadi/{sm|md|lg}/{1-7}.webp`.
- Height: 300 (mobile, full-bleed), 420 (tablet, full-bleed), 540 (desktop, rounded 32, left column).
- Controls: prev/next round buttons (white 92 %) and a white pill holding 7 dots; the active dot is a 24 px blue bar, inactive dots are 8 px circles.
  Tablet: arrows and dots in a row near the bottom (above the overlapping card). Desktop: dots bottom-left, arrows bottom-right.
- **Mobile uses a compact control instead**, so the photo stays visible: one small translucent dark pill **centred horizontally** near the bottom (just above the overlapping next-mass card), `rgba(17,25,35,0.55)` with a 6 px backdrop blur. It holds a 40 px "‹" button, the dots (6 px tall, 5 px apart; active = 16 px white bar, others 6 px white at 50 %) and a 40 px "›" button. About 180 × 40 px in total. The dots are only an indicator (`aria-hidden`); navigation is by the two buttons and **swipe**. Same in the dark theme.

### 4.3 Next mass ("Nejbližší mše svatá"), the most important block
- A white card. **Mobile/tablet:** overlaps the carousel (negative top margin −44 / −72). **Desktop:** sits beside the carousel (flex-wrap row: carousel `flex: 999 1 560px`, card `flex: 1 1 380px`).
- Content: eyebrow, day line ("Zítra · neděle 4. 10."), **huge time** in blue, place plus church with a pin icon, a **countdown** (3 tiles: days / hours / minutes, Czech plurals), a "Následující bohoslužby" list (next 2), the primary button **"Pořad bohoslužeb (PDF)"**, and the caption "Ohlášky na týden …".
- Tablet: two columns inside the card (time and button left, countdown and list right).
- Desktop: the PDF button lives in the header; the card ends with the link "Pravidelné bohoslužby a ohlášky →".
- The countdown can be switched off (it's an optional feature).

### 4.3a "Tento týden" week calendar (blue)

Placed **directly after the next-mass block and before Aktuality**. The parish
considers the calendar essential, so it is the second thing visitors see.

- **Header:** H2 "Tento týden" with the blue shard (26 / 32 / 40 px) and, under it, the muted range "po 28. 9. – ne 4. 10.". On the right: two 44 px buttons **"Předchozí týden" / "Další týden"** (chevrons, `aria-label`) and the link "Celý kalendář" to `/kalendar`. Navigating changes the title to "Příští týden" / "Minulý týden" / "Týden 12. 10." (the H2 is `aria-live="polite"`). Without JS the buttons can be links `?tyden=2026-W41`.
- **The week runs Monday → Sunday** (Czech convention), never "today + 6 days". 7 day cards in an ordered list.
- Each **upcoming day** card (today and later):
  - header: "Dnes" / "Zítra" / weekday in bold, the date muted on the right ("so 3. 10.", "5. 10.");
  - **events** (Události calendar): 4 px magenta bar, time ("celý den", "18:30") in magenta-ink, title in bold, linked when the event has a detail page. **Titles are clamped to 2 lines** (`-webkit-line-clamp: 2`, full title stays in the DOM / `title` attribute);
  - **overflow rule – the same as the Kalendář grid (16.2):** with 1–2 events show all of them; with **3 or more** show the first event and a **"+N další"** badge (magenta tint `#FDEEF3`, magenta-ink, radius 6, 13 px bold) that links to `/kalendar` with that day selected (`/kalendar?den=2026-10-04`). So a card holds at most two event rows and the row of cards keeps an even height however busy a day is;
  - **one compact services line** (Bohoslužby calendar): blue bar, label "Bohoslužby", times joined with " · " ("8:00 · 9:30 · 11:00");
  - "Bez programu" when the day is empty.
- Today: blue-tint background with a 2 px blue border. Other days: `--surface`.
- **Past days of the current week:**
  - **Mobile / tablet:** collapsed to **narrow 76 px cards** at opacity 0.55: short weekday ("Po"), date, and a summary ("2× mše · 1 akce" or "—"). This keeps today in view on the first screen without scrolling the row. Also scroll the row so that today is the first fully visible card (`scrollIntoView({inline: 'start'})` on load) as a safety net.
  - **Desktop:** full cards in the 7-column grid at opacity 0.55.
  - In other weeks (prev/next) all days are full cards; a past week is fully dimmed.
- Layout: mobile, a horizontal scroll row of 200 px cards (bleeds to the screen edges, 16 px inner padding); tablet, the same with 210 px cards and 32 px padding; desktop, `grid-template-columns: repeat(7, minmax(0, 1fr))`, gap 12.
- Data: the same source as the Kalendář page (16.4). Render server-side; the week navigation can fetch `/kalendar/tyden?od=YYYY-MM-DD` (HTML fragment or JSON).

### 4.4 Aktuality (magenta)
- The 3 nearest events on mobile, 4 on tablet/desktop. "Všechny aktuality" link to `/aktuality/`.
- **Mobile/tablet:** a horizontal card with a date block (64–72 px; magenta fill for the highlighted item, white otherwise) plus title and excerpt. Tablet uses a 2×2 grid.
- **Desktop:** vertical cards with a poster image (210 px tall, rounded 24) and a date chip overlaid top-left, then title and excerpt. `repeat(auto-fit, minmax(min(250px,100%),1fr))`.
- "Právě probíhá" pill when today falls between the event's start and end. The highlighted card uses the magenta tint background.

### 4.5 Fotogalerie (green) – carousel of the newest album

- Header: H2 "Fotogalerie" with the green shard, link "Celá fotogalerie" to `/fotogalerie`.
- **Stage** (`role="region" aria-roledescription="carousel"`, label "Fotografie z alba …"): the photos of the **newest album** one at a time. Ratio 4:3 on mobile, 16:9 on tablet, 16:10 on desktop; radius 20 / 24 / 28. 48 px round prev/next buttons (white 92 %, dark icon) at the sides, and a counter pill "3 / 12" bottom-right (`aria-live="polite"`). Swipe on touch; arrow keys when focused. Autoplay: the next photo every 6 s (wrapping around), with the rules in section 5.
- Caption under the stage: the date (muted), album title (bold), link "Celé album →".
- **"Další alba"**: the next 3 albums as compact rows (88×66 thumbnail, date, title), on `--surface`, radius 16. Mobile/tablet: under the stage. Desktop: a column beside the stage (stage `flex: 999 1 640px`, list `flex: 1 1 340px`).
- Photos load lazily except the first; use the Zonerama `sm`/`md` image sizes via `srcset`.

### 4.6 Petrklíč (orange) and Kontakty (blue)
- Mobile: two stacked blocks. Tablet: side by side (2 columns). Desktop: `auto-fit, minmax(min(440px,100%),1fr)`.
- **Petrklíč:** orange-tint panel, cover thumbnail (portrait about 1:1.41, white, shadow), eyebrow "Farní zpravodaj", title "Petrklíč 1/2026", one-line description, orange button **"Číst Petrklíč (PDF)"** (dark text), link "Archiv starších čísel".
- **Kontakty:** blue-tint panel with icon rows: address, phones, email, úřední hodiny. Outline button or link "Všechny kontakty" to `/kontakty`. Desktop shows the rows in a 2-column grid.

### 4.7 Footer

**Superseded by the sitemap footer in section 20.**
- Stripe on top, surface background. Logo plus "Římskokatolická farnost Kuřim", the line "Kuřim · Moravské Knínice · Jinačovice · Česká", bank account, link "Virtuální prohlídka kostela".

## 5. Behaviour

### Carousel
- Prefer a CSS scroll-snap track (`overflow-x:auto; scroll-snap-type:x mandatory`) plus small vanilla JS for arrows, dots and autoplay.
- `<picture>` per slide: `lg` at `(min-width:1200px)`, `md` at `(min-width:768px)`, and `sm` as the `<img>` fallback.
- Slide 1 `fetchpriority="high"`, others `loading="lazy"`. Meaningful `alt` per photo.
- Autoplay (every carousel, 6 s) pauses on hover and focus and while the carousel is off screen, stops for good once the visitor swipes or uses the arrows, dots or arrow keys, and is off under `prefers-reduced-motion`.
- Buttons have `aria-label` ("Předchozí fotografie", "Další fotografie", "Fotografie N"); the active dot has `aria-current="true"`.

### Motion
- **Colour changes fade (~150 ms)** on everything interactive (links, buttons, pills, cards, menu items), also under `prefers-reduced-motion`.
- **Movement only when motion is allowed** (`prefers-reduced-motion: no-preference`):
  - the menu (the "Více" panel and the mobile/tablet drawer) slides in 8 px (200 ms);
  - accordions (`<details>`: footer and drawer groups, PULS table, Starší projekty yearly breakdown) open by height (200 ms);
  - photos that open something (gallery strips, homepage Fotogalerie thumbnails, Schola thumbnails and video cards, event posters) zoom the image to 103 % on hover (300 ms) inside their rounded frame;
  - the Finanční podpora progress bars fill from the left (700 ms) when they come into view;
  - photos and Petrklíč pages fade in once loaded (300 ms).
- The copy buttons' "Zkopírováno" fades in with a tick icon.
- **No** lift or shadow on hover, **no** page transitions, **no** whole-page animation on a theme switch.

### Next mass and countdown
- **Server-side** computes the next mass from the regular schedule **plus exceptions**, and renders it into HTML (works without JS).
- Emit `<time datetime="YYYY-MM-DDTHH:MM">`. JS reads it, updates the countdown every 20–30 s, and when the time passes, swaps to the next item (embed the next few as JSON).
- Czech plurals: 1 den / 2–4 dny / 5+ dní; hodina/hodiny/hodin; minuta/minuty/minut.
- Day label: "Dnes", "Zítra", otherwise the capitalised weekday. Date format `4. 10.`
- The mockup's script block contains a working reference implementation (regular schedule only).

Regular schedule (from `/porad_bohosluzeb/`):

| Day | Time | Place |
|---|---|---|
| Po | 8:00 | Kuřim, kostel sv. Maří Magdalény |
| Čt | 18:00 (adorace 17:30) | Kuřim |
| Pá | 16:45 (1. pátek 18:15) | Kuřim |
| Pá | 18:00 (1. pátek 17:00) | Moravské Knínice, kostel sv. Markéty |
| So | 8:00, only on the first Saturday | Kuřim |
| Ne | 8:00, 9:30 | Kuřim |
| Ne | 11:00 | Moravské Knínice |
| | dle domluvy | Jinačovice |

The first-Friday and first-Saturday variants, and week-specific changes from the
ohlášky (e.g. 4. 10.: second mass in Kuřim at 11:00, Moravské Knínice at 9:30),
must come from the exceptions data, not be hard-coded.

## 6. Homepage data sources

| Block | Source |
|---|---|
| Pořad bohoslužeb PDF | latest uploaded file in `nahrane/porady_bohosluzeb/` (current: `6ab9325f1b46d.porad_bohosluzeb.pdf`), plus its date range for the caption |
| Aktuality | existing news records: upcoming or ongoing (end ≥ today), sorted by start date; poster image from `nahrane/aktuality/` |
| Fotogalerie | Zonerama `FarnostKurim/425053`, cached server-side (about 1 h): albums with title, date, photo count and photo URLs (the newest album's photos feed the carousel) |
| Petrklíč | newest issue record, `petrklic/pdf?id=…`; cover thumbnail generated from PDF page 1 on upload |
| Kontakty | Křížkovského 55/5, 664 34 Kuřim · 541 230 183 · 723 661 146 · fara.kurim@seznam.cz · Po 9:00–10:00, Čt 19:00–20:00 (mimo letní prázdniny), jindy dle domluvy |
| Footer | bank account 247704317/0300 · `/virtualni_prohlidka/` |

## 7. Accessibility

- Real `<a>` and `<button>` elements; icon-only buttons get `aria-label`; all decorative shards and the stripe are `aria-hidden`.
- Text contrast ≥ 4.5:1. Use the `*-ink` shades for coloured text. Never white on green or orange.
- `<html lang="cs">`. One `<h1>` per page (the mockups use the next-mass heading; consider a visually hidden brand H1 instead) and H2 per section.
- The menu toggle uses `aria-expanded` and `aria-controls`.

## 8. Placeholders in the mockups (replace with real content)

- Carousel slides are tinted boxes labelled with their intended file path.
- `[foto alba]`, `[plakát akce]` and `[obálka čísla]` are placeholders for album covers, news posters and the Petrklíč cover.
- News texts were written from the current site's news on 3. 10. 2026. In production they come from the database.

## 9. Assets to add to the repo

- Oxygen woff2 (300, 400, 700), self-hosted.
- `favicon.svg` = `assets/logo-farnost-kurim.svg`, plus a 180×180 PNG `apple-touch-icon` and a 32×32 PNG fallback.

## 10. Dark theme

Same layout, components and section colours; only the tokens change. The mood
stays **friendly, not gloomy**: a deep blue-tinted night ground (never pure black),
the four brand colours kept as fills, and lighter shades of them for text.
Mockups: `mockups/home/dark/` and `mockups/aktuality/dark/`.

### Switching

- Default: follow the OS with `prefers-color-scheme: dark`.
- Manual override: a 44×44 icon button (sun/moon) in the header, before the
  hamburger on mobile/tablet and after the nav on desktop. It sets
  `<html data-theme="light|dark">`, saved in `localStorage`, applied by a tiny inline
  script in `<head>` before CSS paints (no flash). `aria-label="Přepnout na tmavý režim"` /
  `"Přepnout na světlý režim"`, `aria-pressed` reflects the dark state.
  The mockups show it (moon in light, sun in dark); in the design tool's Play
  mode it jumps to the other theme's artboard.
- Set `color-scheme: light` / `color-scheme: dark` on `:root` so form controls
  and scrollbars follow.

```css
:root { color-scheme: light; /* light tokens from section 2 */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark tokens */ }
}
:root[data-theme="dark"] { /* dark tokens (same block) */ }
```

### Dark tokens

Same variable names as section 2, so components never reference raw hex.

```css
/* dark */
:root {
  color-scheme: dark;

  /* Brand fills: unchanged */
  --blue:    #1D71B7;  /* white text on it: 5.1:1 */
  --green:   #2EAC66;  /* decorative only */
  --magenta: #D60B51;  /* white text on it: 5.2:1 */
  --orange:  #F39200;  /* text on it must be --on-orange */
  --on-orange: #111923; /* light theme: #1B2533 */

  /* Text-safe shades become LIGHTER */
  --blue-ink:    #7DB8EE;  /* hover #A9D1F5 */
  --green-ink:   #5FD394;
  --magenta-ink: #FF7AA6;
  --orange-ink:  #FFB547;  /* deeper on orange tint: #FFC266 */
  --time:        #6AAEEA;  /* big next-mass time (light theme: --blue) */

  /* Tints become dark tinted surfaces */
  --blue-tint:    #172A40;  /* alt #1C3350, divider on tint #24405E */
  --green-tint:   #163A2A;
  --magenta-tint: #331824;  /* alt #40192B */
  --orange-tint:  #33240F;  /* alt #3D2A12 */

  /* Neutrals */
  --ink:      #EEF2F7;
  --ink-2:    #C3CCD8;
  --muted:    #9AA6B5;
  --line:     #2A3648;  /* lighter divider #243042 */
  --surface:  #18212F;  /* neutral cards, footer */
  --raised:   #1F2B3D;  /* small white blocks in light theme: date tiles, pills, Petrklíč cover */
  --card:     #1C2738;  /* next-mass card (light: #FFFFFF) */
  --bg:       #111923;  /* page, header */
  --dot-on:   #7DB8EE;  /* light: #1D71B7 */
  --dot-off:  #5A6B82;  /* light: #C9D6E3 */
  --overlay:  rgba(17,25,35,.88);  /* carousel buttons and dot pill (light: rgba(255,255,255,.92)) */
  --shadow:   rgba(0,0,0,.45);     /* light: rgba(29,113,183,.16), Petrklíč cover rgba(168,88,0,.18) */
}
```

Light-theme roles that were all plain `#FFFFFF` split into three in dark:
**`--bg`** (page, header, mobile menu), **`--card`** (next-mass card) and
**`--raised`** (date tiles, "Právě probíhá" pill, nav pills, Petrklíč cover).
Add `--on-orange`, `--time`, `--raised`, `--card`, `--dot-on`, `--overlay`
and `--shadow` to the light token set too, with the light values noted above.

### What stays the same

- Brand fills (blue/magenta buttons and date blocks with white text, orange
  Petrklíč button with dark text), shards, the colour stripe and the logo. The
  logo colours read well on `--bg`; no separate dark logo is needed.
- Layout, sizes, radii, type scale.

### Contrast (checked)

| Pair | Ratio |
|---|---|
| `--ink` on `--bg` / `--card` | 15.7 / 13.4 |
| `--ink-2` on `--card` | 9.3 |
| `--muted` on `--bg` / `--card` / `--surface` / `--raised` | 7.2 / 6.1 / 6.6 / 5.8 |
| `--blue-ink` on `--bg` / `--card` / `--blue-tint` | 8.4 / 7.1 / 6.9 |
| `--time` on `--card` | 6.3 |
| `--green-ink` on `--bg` | 9.5 |
| `--magenta-ink` on `--bg` / `--magenta-tint` / `--raised` | 7.2 / 6.6 / 5.8 |
| `--orange-ink` on `--orange-tint` | 8.5 |
| white on `--blue` / `--magenta` | 5.1 / 5.2 |
| `--on-orange` on `--orange` | 7.5 |
| `--dot-on` on `--overlay` | ≥ 4.8 |

### Photos and images in dark

- Carousel and album photos: no filter. Optionally `filter: brightness(.92)` on
  very bright photos only; never invert.
- News posters (often white paper): show on `--raised` with 8–12 px padding and
  rounded corners, so a white poster reads as a card instead of a glaring hole.
- Petrklíč cover: real cover image as is, with the dark `--shadow`.

## 11. Aktuality page (`/aktuality/`)

Mockups: `mockups/aktuality/`. Uses the same tokens, header, footer, stripe and
shards as the homepage. Section colour: **magenta**.

### 11.1 Shared header rule (applies to every page)

The current page's nav item uses **its section's** tint and ink with
`aria-current="page"`: Aktuality is a magenta-tint pill with magenta-ink text
(desktop and the tablet menu grid) and bold magenta-ink text in the mobile list.
The homepage's "Úvod" keeps the blue pill.

### 11.2 Page structure (top to bottom)

1. **Breadcrumb**: `Úvod › Aktuality` (14/15 px, muted), in a `<nav aria-label="Drobečková navigace">`.
2. **H1 "Aktuality"**: 36 / 44 / 56 px bold (mobile / tablet / desktop), magenta shard on the left (20×28 / 24×34 / 28×40).
3. **Featured event ("Doporučujeme")**: one pinned event.
   - Magenta-tint panel, radius 24 / 28 / 32, magenta and orange triangles top-right.
   - Poster 96×136 (mobile, beside the button) / 200×282 (tablet, left) / 236×334 (desktop, left), white with soft shadow.
   - Eyebrow "Doporučujeme" (uppercase, magenta-ink), H2 title 26 / 32 / 44 px, date and place rows with calendar and pin icons (magenta-ink), description, magenta button "Plakát" / "Zobrazit plakát" and an outline button **"Více o akci"** to the detail page.
   - The pinned event is **not repeated** in the list below. No pinned event means the panel is not rendered.
4. **Filters and count**: see 11.3.
5. **Grouped event list**: see 11.4 and 11.5.
6. **"Načíst další aktuality"**: magenta outline button (52 px). Full-width on mobile, centred on larger screens. See 11.6.
7. **"Archiv aktualit" panel**: surface background, heading, one line "Starší pozvánky a ohlédnutí za proběhlými akcemi.", link or outline button "Otevřít archiv" to `/aktuality/archiv` (section 12).

### 11.3 Filters

Chips (single choice) replace the old "Vytvořeno", "Zobrazit prvních N" and
"Archivované" controls. Visitors filter by **when the event happens**, not when it
was posted.

| Chip | Shows |
|---|---|
| **Nadcházející** (default) | everything not yet finished (end ≥ today), including ongoing and long-term |
| Tento týden | events overlapping today … next Sunday, except long-term |
| Tento měsíc | events overlapping the current calendar month, except long-term |
| Dlouhodobé | long-term series only (see 11.5) |
| Vše | everything, including finished events in a "Proběhlo" group |

- Chips are 44–46 px tall pills. Active: magenta fill, white text. Inactive: surface fill, ink text, `--line` border.
- Mobile: one horizontally scrollable row that bleeds to the screen edges. Tablet and desktop: wrapping row, with the count on the right.
- Implement as **links** with a query parameter (e.g. `?kdy=tyden|mesic|dlouhodobe|vse`), so the filter works without JS and can be shared. JS may enhance it to swap the list without a reload. Use `aria-current="true"` on the active link (the mockups use `aria-pressed` on buttons).
- Count with `aria-live="polite"`, Czech plural agreement on both verb and noun: **"Zobrazena jedna akce"**, **"Zobrazeny 2 akce"** (2–4), **"Zobrazeno 5 akcí"** (0 and 5+).
- Empty state: "V tomto období nejsou žádné akce." in a surface panel.

### 11.4 Grouping

- Group by **start month**: "Říjen 2026", "Prosinec 2026"… (magenta-ink H3, 18 / 20 / 24 px, followed by a hairline). Ongoing events belong to the month they started.
- Then **"Dlouhodobé akce"** (blue-ink heading).
- Then **"Proběhlo"** (muted heading, only under "Vše"). Its cards are drawn at 72 % opacity with a "Proběhlo" tag.
- Within a group, sort by start date ascending.

### 11.5 Event card

| Part | Mobile | Tablet | Desktop |
|---|---|---|---|
| Layout | date block + title/meta row, then text, tags, actions | date block · content · poster | date block · content · poster |
| Date block | 60×68 | 72×80 | 88×96 |
| Title (H4) | 17 | 20 | 24 |
| Poster thumbnail | hidden (reachable through the attachment button) | 108×152 | 132×186 |
| Card | white, `--line` border, radius 20, padding 16 | radius 24, padding 20 | radius 28, padding 24 |

- **Date block**: magenta-tint fill with magenta-ink text: day(s) on top ("7.", "2.–4.") and month in the genitive below ("října", "prosince"). Filled **magenta with white text** when the event is happening now. Long-term series show the weekday and time ("čt / 18:30") or a month range ("III–XI / 2026").
- **Tags** (13–14 px pills):
  - `now` "Právě probíhá": magenta / white
  - `deadline` "Přihlášky do 10. 10.": orange tint / `#8A4B00` (dark: `--orange-tint` / `#FFC266`)
  - `info` "300 Kč", "7 setkání", "Každý týden": blue tint / blue ink
  - **free tags** (entered by the editor, e.g. "Zrušeno"), each in its own colour:
    - blue (default): blue tint / blue ink
    - orange: orange tint / `#8A4B00` (dark: `--orange-tint` / `#FFC266`)
    - magenta: magenta tint / magenta ink (the colours of the date block)
    - grey: surface / ink-2 (like "Proběhlo")
  - `past` "Proběhlo": surface / ink-2
  - **Order:** "Právě probíhá", the deadline, the computed tags (price, "N setkání", "Každý týden"), then the free tags, and "Proběhlo" last.
  - "N setkání" is the number of meetings listed for a series (11.7).
- **Meta**: the full date/time text ("pátek 2. – neděle 4. 10. 2026", "neděle 25. 10. 2026 · 9:30") and the place with a pin icon.
- **Series of meetings** (a course, a cycle of evenings): the date block and the date line show the **first meeting** ("od neděle 11. 10. 2026"). "vždy 18:00–20:30" is added only when all meetings share the event's time; otherwise the time is left out of the line.
- **Text**: a short description (aim for 1–2 sentences, clamp to 3 lines on mobile).
- **Actions** (44 px, surface fill, radius 12):
  - attachments: file icon in magenta-ink, label plus type in muted ("Plakát PNG", "Pozvánka PDF");
  - external links and e-mail: arrow-out icon in blue-ink.
- **Poster thumbnail**: rendered with `object-fit: contain` on the event's tint, so portrait posters are never cropped. Dark theme: add 8–12 px padding (section 10).
- The **card title is a link** to the event's detail page (section 13), stretched over the whole card: a click anywhere on the card opens the detail, and hovering the card underlines the title. The attachment and link buttons stay separate targets above it; don't wrap the card in one link (screen readers announce only the title).

### 11.6 Paging

10 cards per page. "Načíst další aktuality" is a real link to `?strana=2` (keeps
the active filter). With JS it fetches and appends the next page and moves focus
to the first new card. Hide the button on the last page.

### 11.7 Data each event needs

| Field | Notes |
|---|---|
| title | required |
| start, end | dates; end optional (single day) |
| time text | optional free text ("9:30", "18:00–20:30", "každý čtvrtek od 18:30") |
| place | free text |
| text | short description |
| poster | image, used for thumbnail and featured panel |
| attachments[] | label, file (type shown from extension) |
| links[] | label, URL (http or mailto) |
| tags | price, registration deadline (date), the series' meetings (dates, each with an optional own time or end day; their count is the "N setkání" tag), free tags (label and colour: blue, orange, magenta or grey) |
| long-term | set by the editor, never derived: either "every week on the start's weekday at a time" (a weekly series with no end date list, shown with the "Každý týden" tag and the weekday and time in the date block) or "other long-running event" (e.g. an exhibition, shown with a month range "III–XI"). A series of meetings with listed dates is **not** long-term: it is a normal event shown by its first meeting. |
| pinned | boolean; at most one pinned event is shown in "Doporučujeme" |

"Právě probíhá" and "Proběhlo" are **computed** from start/end and today, never stored.

**Series of meetings:** a series stores the date of **every meeting**, not just a count. A meeting either uses the event's time, has its own time, or lasts several days (e.g. a weekend retreat: start and end day). Series are **not assumed to be weekly**. In the calendar (section 16) and in the "Přidat do kalendáře" `.ics` file (13.2), **each meeting is its own entry** at its own time. For a series, start = the first meeting, end = the last meeting.

### 11.8 Dark theme

Same mapping as section 10. The new pieces map as follows:
- featured panel: `--magenta-tint`;
- featured poster shadow: light `rgba(214,11,81,.12)` becomes `--shadow`;
- cards: `--raised`;
- chips: inactive `--surface` with `--line` border, active magenta with white text.

The mockups in `mockups/aktuality/dark/` show the result.

## 12. Archiv aktualit (`/aktuality/archiv`)

Mockups: `mockups/archiv/`. A compact, searchable list of finished events. It
replaces the old archive with its "Vytvořeno" dropdown and `takeCount` /
`archived=1` parameters.

### 12.1 Structure

1. Breadcrumb `Úvod › Aktuality › Archiv`, H1 "Archiv aktualit" (32 / 42 / 52 px) with the magenta shard, one-line intro "Proběhlé akce, pozvánky a plakáty farnosti."
2. **Search and year filter.** Mobile: stacked. Tablet: one surface panel with the search box and the year buttons side by side. Desktop: a **left side panel** (`flex: 1 1 280px`) next to the list (`flex: 999 1 600px`), with "Zpět na aktuality" at its bottom.
3. Result count ("Zobrazeno 21 akcí"; search: "Nalezena jedna akce" / "Nalezeny 3 akce" (2–4) / "Nalezeno 5 akcí" (0 and 5+); the same forms with "Zobrazen-", `aria-live="polite"`) and, while searching, a "Zrušit hledání" text button.
4. **List grouped by month, newest first** ("Srpen 2026", "Červenec 2026"…; magenta-ink H2 18 / 20 / 22 px).
5. "Načíst starší" (magenta outline) and "Zpět na aktuality".

### 12.2 Search and years

- `<label>` "Hledat v archivu" plus `<input type="search">` (50 px tall, radius 14, border `#7D8A9B`, which meets the 3:1 boundary contrast; magnifier icon inside on the left). Placeholder "např. pouť, koncert, Tišnov".
- Search looks in the **title and place across all years**. While a search is active, no year is selected.
- **All years are visible** as year buttons, from the newest down to **2019** (where the archive starts), each with its count in a lighter weight ("2024 25"). There is no "Starší" bucket and no hidden years. Active: magenta with white text. Default: the year of the most recent archived event.
  - Mobile: one **horizontally scrolling row** of pills that bleeds to the screen edges (scroll the active pill into view on load).
  - Tablet: pills that wrap onto a second row.
  - Desktop: a full-width vertical list in the sidebar.
- **One year per view:** picking a year shows exactly that year, grouped by month.
- Generate the year list from the data (years with at least one archived event).
- Implement as a GET form plus links: `?q=…`, `?rok=2025`, `?rok=2021`. Without JS, the form submits. With JS, debounce about 250 ms and update the list in place.
- Empty state: "Nic jsme nenašli. Zkuste jiné slovo nebo rok."

### 12.3 Archive row

Each row is **one link** to the event's detail page (the whole row is the target, at least 64 px tall).

| Column | Mobile | Tablet / desktop |
|---|---|---|
| Date | 64 px: date bold ("3. 8.", "2.–6. 4."), time muted below | 96 / 112 px, same content |
| Main | title (16 / 17 / 18 bold), place muted | same |
| Attachment | under the place: file icon + "Plakát PDF" | right-aligned surface chip with icon + type |

Rows are separated by a 1 px `--line` hairline. There are no images in the archive,
to keep it fast and easy to scan.

### 12.4 Paging and data

A year shows its **first 20 events** (newest first, grouped by month) and the count line says
"Zobrazeno 20 z 25 akcí" (while more are left; the genitive "akcí" is always used after "z"). Under the list:
- **"Načíst další"** (magenta outline button) appends the next 20 events of the same year (`?rok=2026&strana=2`, keeps `q`).
- Once the whole year is loaded, the button is replaced by **"Rok 2025 →"**, which opens the previous year from its start (`?rok=2025`) and scrolls to the top of the list. It is not shown on the oldest year (2019).
- Search results across all years page the same way (20 at a time with "Načíst další"); the year button is not shown during a search.
- Changing the year or the search text resets the paging.
The archive uses the same event record as section 11.7. An event appears in the
archive the day after its end date. A manual "archived" flag is no longer needed,
though an admin may still hide an event.

## 13. Detail akce (`/aktuality/<id>`)

Mockups: `mockups/detail/`. The example is "Slavnostní mše k jubileu 800 let".
Section colour: magenta. The header's current item stays "Aktuality".

### 13.1 Structure

| Block | Mobile | Tablet | Desktop |
|---|---|---|---|
| Breadcrumb | `Úvod › Aktuality › <title>` | same | same |
| Labels | "Doporučujeme" (only if pinned, magenta tint) + **relative time** ("Za 15 dní", "Zítra", "Dnes", "Proběhlo"; blue tint) | same | same |
| H1 + lead | 32 px + 18 px lead | 44 + 20 | 56 + 22 (lead max 680 px) |
| "Kdy a kde" panel | full width | left, beside the poster (236×334) | **right column** (`flex: 1 1 360px`), poster (460 px tall) below it |
| O akci / Program / 800 let v datech / Přílohy | stacked | stacked | left column (`flex: 999 1 560px`), text max 700 px |
| Další akce | 3 compact cards + "Všechny aktuality" | 2 cards in a grid | 3 cards, `auto-fit minmax(280px)` |

### 13.2 "Kdy a kde" panel

- Magenta-tint panel with magenta and orange triangles top-right, radius 24 / 28 / 28.
- Rows with icons (magenta-ink): **Kdy** (label muted, value bold) and **Kde** (place bold + "Zobrazit na mapě" link to Mapy.cz with the place as a query).
- **"Přidat do kalendáře"**: magenta filled button, 52 px. It downloads an `.ics` file (`/aktuality/<id>/kalendar.ics`) with title, start/end, place and the page URL; for a series of meetings it contains one `VEVENT` per meeting, each at its own time (11.7). This is a new feature.
- **"Sdílet"**: magenta outline button. It uses `navigator.share()` where available, and otherwise copies the URL and shows "Odkaz je zkopírovaný." (`role="status"`).

### 13.3 Content blocks

- **O akci**: the event's body text (rich text: paragraphs, bold, links, lists). H2 22 / 26 / 28.
- **Program** (optional): an ordered list of rows `time | title + note`, with the time column in magenta-ink, 76 / 100 / 120 px wide.
- **Highlight tiles** (optional, used here as "800 let v datech"): up to 3 tiles, each in one brand tint (green, blue, orange) with its shard top-right, a big number in that colour's ink and a short label. Use them only when the event really has key facts or numbers.
- **Přílohy**: one row per file with the file icon, name and "TYPE · size".
- **Poster**: full poster with `object-fit: contain`, a round magnifier badge bottom-right, and the whole poster is a button that opens the **poster lightbox** (section 21). Under it: "Stáhnout plakát (PNG)" (`download`). Mobile: 240×340, centred. A PDF poster opens in the browser instead.

### 13.4 Data each event needs (in addition to 11.7)

| Field | Notes |
|---|---|
| lead | one sentence under the title |
| body | rich text |
| program[] | time text, title, note (optional) |
| highlights[] | number/short value + label, max 3 (optional) |
| map query | defaults to the place |

Show the relative-time label from the start and end dates. After the event ends, show
"Proběhlo", hide the calendar button, and keep the page reachable from the archive.

### 13.5 SEO and sharing

- `<title>`: "<Event title> – Římskokatolická farnost Kuřim".
- Open Graph image: the poster. Description: the lead.
- Add `schema.org/Event` JSON-LD with name, startDate, endDate, location and image.

### 13.6 Dark theme

The same mapping as sections 10 and 11.8. The green highlight tint `#E8F6EE` maps to `--green-tint` (`#163A2A`).

## 14. Pořad bohoslužeb (`/porad_bohosluzeb`)

Mockups: `mockups/porad-bohosluzeb/`. Section colour: **blue**. The header's
current item is "Bohoslužby" (blue-tint pill).

### 14.1 Structure

1. Breadcrumb `Úvod › Pořad bohoslužeb`, H1 (32 / 44 / 56 px) with the blue shard.
2. **Ohlášky panel ("Tento týden")** (blue tint, blue and green triangles top-right). See 14.5.
   - Header row: eyebrow "Tento týden", H2 "Ohlášky 27. 9. – 4. 10. 2026" (22 / 28 / 36 px), and a blue button **"Ohlášky v PDF"** (full width on mobile, on the right on larger screens).
   - **Announcement cards**: one column on mobile, two on tablet and desktop.
2a. **"Rozpis bohoslužeb tento týden"** below the panel: the weekly schedule from the PDF table, as a day-by-day list. See 14.6.
3. **"Pravidelné bohoslužby"**: H2, a muted note "Dnes je sobota · změny vždy v ohláškách", day filter (14.2), church cards (14.3).
3a. **Intence – mše na váš úmysl** (full-width card above the Smíření and Křty cards; blue tint, blue corner triangle, radius 24 / 24 / 28):
   - H2 "Intence – mše na váš úmysl"; text "Úmysl, na který bude mše svatá sloužena, si můžete nechat zapsat **po každé mši svaté** v sakristii." and "Mše svatá je nejlepší způsob, jak na oltář položit svůj dík i prosbu."
   - H3 "Za co můžete prosit nebo děkovat" with pills (white fill, blue ink, 14 px bold): poděkování za výročí · za zemřelé · za zdraví · za Boží požehnání · v těžké situaci · o dar Ducha svatého.
   - Muted note: "Připadne-li na den mše s intencí pohřeb, mše s vaší intencí se slouží dál."
   - Link "Intence na tento týden najdete v rozpisu bohoslužeb ↑" to the weekly schedule (14.6).
   - Desktop: text left, pills and note right (two equal columns). Tablet and mobile: one column.
   - To confirm with the parish: where intentions are written ("v sakristii" or at the fara) and the wording of the funeral note.
4. **Svátost smíření**: "Půl hodiny před každou mší svatou je možnost přistoupit ke svátosti smíření."
5. **Křty**: "Křty bývají druhou neděli v měsíci v 9:30. Termín si domluvte na faře." plus a link to Kontakty.
6. **Kalendář farnosti**: link to `/kalendar`. Mobile and tablet: outline button. Desktop: a third card beside Smíření and Křty.

### 14.2 Day filter

- Chips: `Celý týden · Po · Út · St · Čt · Pá · So · Ne`. Default: Celý týden.
- Active: blue fill, white text. **Today's chip** has a blue border and `title="dnes"`.
- Mobile: horizontally scrollable. Tablet and desktop: wrapping.
- Filtering is client-side only (all data is on the page). Without JS, the full week shows.

### 14.3 Church card

- One card per church, each with its **own logo colour** as a 6 px top border:
  - Kuřim (Chrám Páně sv. Maří Magdaleny): blue;
  - Moravské Knínice (Chrám Páně sv. Markéty): green;
  - Jinačovice: orange.
- Header: place as H3, the church name in muted, and a 44 px map button on the right (church tint background, Mapy.cz link).
- Body: one block per weekday that has services (Po → Ne). Each block has:
  - the day name in the church's ink colour, plus a "dnes" pill in the church colour when it is today; today's block also gets the church tint as background;
  - rows of `time (bold) | title`, with an optional muted note ("s katechezí pro děti (ve školním roce)") and an optional orange-tint tag ("1. pátek v měsíci", "1. sobota v měsíci").
- Empty states: Jinačovice always shows "Bohoslužby dle domluvy na faře.". A church with nothing on the filtered day shows "Tento den zde není bohoslužba."
- Grid: one column on mobile; `auto-fit, minmax(340px)` on larger screens (2 columns on tablet, 3 on desktop), `align-items: start`.

### 14.4 Data

| Data | Notes |
|---|---|
| churches[] | name, place, colour (blue/green/orange), map query |
| regular services[] | church, weekday, time, title, note, rule: `every` / `first-in-month` |
| this week | ohlášky PDF + its date range, list of changes (date + text), this week's confession times |
| sacrament notes | smíření text, křty text, intence text (intro, reasons as pills, note) |

The homepage "next mass" countdown (section 5) uses the same regular services plus
this week's changes. One data source feeds both pages.

### 14.5 Ohlášky (announcements)

The text that used to exist only under the table in the weekly PDF is published on
the page, word for word.

- One **white card** per announcement (radius 18, padding 18) with a **category label** (13 px pill with an icon) and the text. Key times in the text may be bold.
- Categories (chosen by the editor), each with its own label colour:

| Category | Label | Card |
|---|---|---|
| `zmena` – **Změna bohoslužeb** | orange tint / `#8A4B00`, warning icon | **2 px orange border**, always sorted first |
| `smireni` – **Svátost smíření** | blue tint / blue ink, clock icon | plain |
| `pozvanka` – **Pozvánka** | magenta tint / magenta ink, building icon | plain; optional link "Více v aktualitách →" to the related Aktuality item; e-mails in the text are `mailto:` links |
| `podekovani` – **Poděkování** | green tint / green ink, heart icon | plain |
| `info` – **Oznámení** (generic) | surface / ink-2 | plain |

- Order: changes first, then the order the editor entered.

### 14.6 Weekly schedule ("Rozpis bohoslužeb tento týden")

- H2 plus a text button on the right: **"Zobrazit celý týden (+N dní)"** / **"Skrýt proběhlé dny"** (`aria-expanded`). By default **only today and the coming days are shown**; past days appear dimmed (opacity 0.6) once expanded. When the whole week has passed, everything shows.
- A white list box with one row per day, separated by hairlines:
  - **Day column** (64 / 100 / 140 px): "Ne 4. 10." in bold, blue for Sundays and solemnities; today gets the blue tint background and a "dnes" pill.
  - **Feast line** (13 px bold, magenta-ink for Sundays, muted otherwise): "27. neděle v mezidobí", "sv. Václav"…
  - **Service rows**: time (bold) | place (muted) | text ("Mše sv. – za …", "Adorace", "Pohřeb – …"). On mobile the text wraps onto its own line under time and place. Changed services get an orange **"změna"** tag.
- **Privacy:** the PDF's mass intentions and funeral notices name private people. The mockups show `[úmysl]` / `[jméno]` instead. **The parish should decide** whether names are published on the website (searchable and indexed forever) or only in the PDF. The data model should support a "show on web" flag per row.

### 14.7 Data for ohlášky

Enter ohlášky as **structured content**, one record per week, instead of uploading only a PDF:

| Field | Notes |
|---|---|
| week range | from/to dates; it drives the "Tento týden" title and the homepage note. A sheet longer than 8 days (two weeks around holidays) drops the week wording: eyebrow "Aktuálně", "Rozpis bohoslužeb", "Zobrazit celé období (+N dní)", "Ohlášky 4. 10. – 18. 10." |
| days[] | date, feast (text), Sunday/solemnity flag |
| rows[] | day, time, place, text, `changed` flag, `public` flag |
| announcements[] | category (14.5), text (rich text: bold, links), optional related Aktuality item |
| pdf | optional upload, or generated from the same data |

The regular-schedule exceptions (14.4), the homepage next-mass countdown and the
calendar should all read from these rows, so a change is entered only once.

## 15. Kontakty (`/kontakty`)

Mockups: `mockups/kontakty/`. Section colour: **blue**. The header's current item is "Kontakty".

### 15.1 Blocks

| Block | Content |
|---|---|
| **Fara** (blue tint, blue and green triangles) | eyebrow "Fara", H2 "Římskokatolická farnost Kuřim", `<address>` Křížkovského 55/5, 664 34 Kuřim; buttons **Zavolat** (`tel:+420541230183`, filled) and **Napsat e-mail** (outline); map (placeholder; production: a static map image or Mapy.cz embed, lazy-loaded) with the link "Navigovat na Mapy.cz →" |
| **Úřední hodiny** | live **status line** (see 15.2); rows Pondělí 9:00–10:00 · Čtvrtek 19:00–20:00 (note "mimo letní prázdniny") · Jindy dle domluvy; today's row gets the blue tint |
| **Duchovní správce** | round photo 88 px (placeholder), PhDr. ThLic. Ing. Jaroslav Filka, "duchovní správce farnosti"; `<dl>` Fara 541 230 183 · Mobil 723 661 146 · E-mail fara.kurim@seznam.cz, all as links |
| **Kostely a kaple** | 4 rows, one per village of the parish, each a link to Mapy.cz: colour bar (Kuřim blue, Moravské Knínice green, Jinačovice orange, Česká magenta), village bold, building muted, "Mapa →"; then "Pořad bohoslužeb →". Kuřim: kostel sv. Maří Magdaleny; Moravské Knínice: kostel sv. Markéty; Jinačovice: **kaple sv. Máří Magdaleny** (bohoslužby dle domluvy); Česká: **kaple Panny Marie Růžencové**. Under the Kuřim and Moravské Knínice rows, an indented list of their **other chapels** (40 px rows, a small ring in the village colour, the chapel name, and "Katalog ↗" linking to its page in the diocese catalogue katalog.biskupstvi.cz): Kuřim – kaple Panny Marie Bolestné, kaple sv. Jana Nepomuckého; Moravské Knínice – kaple sv. Cyrila a Metoděje, kaple sv. Jana Nepomuckého. |
| **Podpora farnosti** (orange tint, orange triangle) | "Bankovní účet farnosti", **247704317/0300** at 24 px, button **Zkopírovat** that switches to "Zkopírováno" (Clipboard API, `aria-live`); the button sits on its own line under the number, with a fixed minimum width of about 168 px so the label change never re-wraps it (see 22.2) |
| **Sledujte nás** | Facebook, Instagram, Linktree buttons (**URLs to fill in**), then "Náměty a chyby na webu: Ondřej Planer, oplaner4@gmail.com" |

### 15.2 Office status line

The status is computed from the office-hours data and the current time (Europe/Prague):

- inside office hours: green tint, green dot, "Kancelář je právě otevřená (do 10:00)."
- an office day before opening: "Dnes otevřeno 9:00–10:00."
- an office day after closing: "Dnešní úřední hodiny už skončily."
- other days: "Dnes nejsou úřední hodiny. Zavolejte nebo napište, domluvíme se."

Holidays ("mimo letní prázdniny") need a date range in the data, so the status doesn't
claim the office is open in July and August. Render the status server-side and refresh it with JS.

### 15.3 Layout

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Order | Fara, Úřední hodiny, Duchovní správce, Kostely, Podpora, Sledujte nás | Fara full width; then Hodiny + Správce side by side; then Kostely + Podpora; Sledujte nás full width | Row 1: Fara (`flex: 999 1 560px`, map 300 px tall) with Správce + Hodiny stacked in the right column (`flex: 1 1 400px`); row 2: Kostely · Podpora · Sledujte nás (`auto-fit minmax(340px)`) |
| Map height | 180 | 200 | 300 |

Add `schema.org/Church` or `PlaceOfWorship` JSON-LD with address, phone, e-mail and
`openingHoursSpecification`.

### 15.4 Not designed yet

The current site has no information about křty (beyond the date), svatby, pohřby or
visits to the sick. If the parish wants a "S čím vám pomůžeme" section, it needs that
copy first.

## 16. Kalendář (`/kalendar`)

Mockups: `mockups/kalendar/`. Replaces the current page, which only links to two
Google Calendars. The new page shows both calendars on the site. It is not a menu
item (see 4.1); it is reached from the homepage week calendar ("Celý kalendář"),
the Bohoslužby page and other in-page links. Section colour: **blue**, with
**magenta** for events.

### 16.1 Two calendars, two colours

| Calendar (Google) | Colour | Shown as |
|---|---|---|
| **Bohoslužby** (masses, adoration) | blue `#1D71B7` | calendar name "Bohoslužby", counted as "3× mše" in the grid |
| **Události** | magenta `#D60B51` | "Události" / "Akce", event titles shown as labels in the grid |

### 16.2 Structure

1. Breadcrumb `Úvod › Kalendář`, H1 "Kalendář", lead "Bohoslužby i farní akce na jednom místě. Klepněte na den a uvidíte program."
2. **Toolbar**:
   - previous/next month buttons (44 px, `aria-label`), month label as H2 (`aria-live="polite"`), and a "Dnes" button;
   - two **filter toggles** (`aria-pressed`): "Bohoslužby" (blue outline, filled when on) and "Události" (magenta), both on by default.
3. **Month grid**, weeks starting Monday, with Po–Ne headers:
   - **Mobile** (52 px cells): the day number plus up to two dots, blue for services and magenta for events.
   - **Tablet / desktop** (104 / 118 px cells): the day number, event labels (magenta tint, ellipsis) and "3× mše" at the bottom in blue-ink. **Overflow rule (as implemented):** with 1–2 events, show all of them; with **3 or more**, show the first event and a **"+N další"** label styled exactly like an event label (same tint, radius and size). A cell never shows more than two labels, so all cells keep the same height. The full list is in the day detail.
   - Days outside the month use `--surface` and muted text. **Today** has a 2 px blue border. The **selected day** is filled blue with white text; its event labels turn white with `#8F0634` text.
   - Each cell is a `<button>` with a full `aria-label` ("18. října, 2 bohoslužby, 1 akce") and `aria-pressed` for the selected day.
4. **Day detail** (surface panel): the heading "Dnes · Sobota 3. října" / "Zítra · …" / "Neděle 18. října". One row per item: colour bar, time ("celý den" first), title (a link when there is a detail page), "place · Bohoslužba/Akce". Empty: "V tento den není v kalendáři nic."
5. **"Kalendář v telefonu"** (blue tint): subscribe buttons "+ Bohoslužby" (blue) and "+ Události" (magenta), plus a link to the regular schedule. **The Google Calendar subscription URLs are still to be filled in.**

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Layout | toolbar, grid, day detail, subscribe (stacked) | toolbar, grid full width, then day detail + subscribe side by side | toolbar; grid (`flex: 999 1 640px`) beside a right column (`flex: 1 1 340px`) with day detail + subscribe |

### 16.3 Behaviour

- Clicking a day selects it and updates the day detail. Clicking a day from the previous or next month also switches the month.
- The filters hide or show a calendar in the grid, the day detail and the counts.
- Without JS, render the current month and today's detail server-side. Month links use `?mesic=2026-11` and the day uses `?den=2026-10-18`, so every view has a shareable URL.
- Keyboard: arrow keys move between days (roving tabindex), Enter selects, PageUp/PageDown change the month.

### 16.4 Data

- Read both Google Calendars **server-side** with the Google Calendar API (`events.list`, `singleEvents=true`, `timeMin`/`timeMax` for the visible range), and cache for about 15 minutes. One shared module feeds this page, the homepage week calendar (4.3a) and ideally the next-mass countdown (5).
- Recurring masses should live in Google Calendar as recurring events, with one-off changes (like 4. 10.) as exceptions. The website then has nothing to hard-code.
- The mockups generate October 2026 from the regular schedule and the Aktuality events. Things to confirm with the parish:
  - **First Friday:** the 18:15 (Kuřim) and 17:00 (Moravské Knínice) masses are assumed to **replace** the usual Friday times.
  - **Manželské večery:** the 7 meetings are drawn on the Sundays 11. 10. – 22. 11.; in production they come from the event's list of meeting dates (11.7), each shown as its own calendar entry.
  - **Jubilee and Hubertská masses:** both are drawn as events that replace the regular 9:30 Sunday mass.
- An event of the Události calendar links to its detail page (section 13) when its description holds the page's URL (as the "Přidat do kalendáře" file writes it).

### 16.5 Dark theme

Same mapping as section 10. Cell background `--raised` (`#1F2B3D`), days outside the
month `--surface`, selected day stays blue.

## 17. Petrklíč – aktuální číslo (`/petrklic/aktualni`)

Mockups: `mockups/petrklic/`. Section colour: **orange**. The header's current item is
"Petrklíč" (orange tint `#FFF3E0`, orange ink `#A85800`; dark `#33240F` / `#FFB547`).

### 17.1 Structure

1. Breadcrumb `Úvod › Petrklíč`, H1 "Petrklíč" with the orange shard, lead "Zpravodaj Římskokatolické farnosti Kuřim. Vychází čtyřikrát ročně."
2. **Current issue panel** (orange tint, orange and green triangles bottom-right):
   - **Cover** (A4 ratio, white, orange-tinted shadow): 200×283 on mobile (centred), 240×340 on tablet, 300×424 on desktop. Production: an image of PDF page 1.
   - Eyebrow "Aktuální číslo", H2 "Petrklíč 1/2026" (30 / 40 / 56 px), "Ročník XXI · vydání 1", one-line intro.
   - Buttons: **"Číst online"** (orange fill, dark text; opens the PDF in the browser) and **"Stáhnout PDF"** (orange outline, `download`). Full width on mobile.
3. **"Listujte přímo zde"** (tablet and desktop only): an embedded page viewer (pdf.js or pre-rendered page images) with prev/next buttons and "Strana 1 / 16" (`aria-live`). Desktop shows a two-page spread after the cover ("Strany 2–3 / 16"); tablet shows one page. Link "Otevřít na celou obrazovku →". Mobile skips the viewer and uses "Číst online".
4. **Předchozí čísla**: the last 4 issues as cover tiles with "4/2025 · ročník XX". Mobile: horizontal scroll of 140 px tiles. Tablet and desktop: 4 columns. Link "Celý archiv →".
5. **Napište do Petrklíče** (blue tint): "Články a příspěvky do zpravodaje posílejte e-mailem redakci." plus a button `mailto:petrklic.kurim@gmail.com`.
6. **Redakce** (surface): editor names as pills (Jana Kolaříková, Dáša Montagová, Eva Ryšavá, Jaroslav Filka, Martin Strašák) and "Grafika obálky: Pája Polášková".

On tablet and desktop, blocks 5 and 6 sit side by side.

## 18. Archiv Petrklíče (`/petrklic/archiv`)

Mockups: `mockups/petrklic-archiv/`. Replaces the old table (Název / Rok / Vydání /
Ročník / Akce, with 10/20/50/100 paging).

### 18.1 Structure

1. Breadcrumb `Úvod › Petrklíč › Archiv Petrklíče`, H1, lead "Všechna čísla zpravodaje ke stažení ve formátu PDF."
2. **Year chips**: Vše · 2026 · 2025 · …, with an orange active state and dark text. Mobile: scrollable row. Implement as links `?rok=2025`.
3. **One block per year** (newest first), separated by a hairline:
   - Year as H2 (20 / 24 / 32 px) plus "ročník XX" muted. On desktop the year sits in a 200 px left column next to the covers; on smaller screens it sits above them.
   - **Issue tiles** (2 columns on mobile, 4 on tablet and desktop): the cover (A4 ratio, link to read), then the label "1/2026" with an orange **"nové"** pill for the current issue, and a 44 px **download** button (`aria-label` "Stáhnout Petrklíč 1/2026 (PDF)").
   - Placeholder covers are tinted by issue number (1 green, 2 blue, 3 orange, 4 magenta). Real covers replace them.
4. "Načíst starší ročníky" (loads the next 5 years) and a link back to "Aktuální číslo".

### 18.2 Data

| Field | Notes |
|---|---|
| year, issue number | "1/2026" is built from these |
| volume (ročník) | Roman numeral, or computed: year − 2005 |
| pdf | file |
| cover | image, generated from PDF page 1 on upload (about 600 px wide, WebP) |
| page count | for the viewer label |
| published at | date; the newest issue is "aktuální" |

The homepage Petrklíč card (4.6) shows the newest issue's cover and links to
`/petrklic/aktualni`. "Archiv starších čísel" links to `/petrklic/archiv`.

## 19. Fotogalerie (`/fotogalerie`)

Mockups: `mockups/fotogalerie/`. Section colour: **green**. The header's current item is
"Fotogalerie" (green tint `#E8F6EE`, green ink `#17784A`; dark `#163A2A` / `#5FD394`).

### 19.1 Structure

1. Breadcrumb `Úvod › Fotogalerie`, H1 "Fotogalerie" with the green shard, lead "Fotografie z farních akcí. Starší alba najdete na Zonerama."
2. **One block per album** (newest first), separated by a hairline:
   - date as a green-tint pill, H2 album title (22 / 24 / 28 px), "12 fotografií" muted, and the link "Otevřít album →" on the right (Zonerama album URL).
   - a **photo strip carousel**: 1 photo visible on mobile, 2 on tablet, 3 on desktop (4:3, radius 16–20). Under it: prev/next 48 px round outline buttons and the counter "1–3 / 12" (`aria-live`). The arrows move by one page and wrap around; autoplay turns a page every 6 s while the strip is on screen and the lightbox is closed (rules in section 5). Each photo opens the **photo lightbox** (section 21) at that photo; "Otevřít album →" still links to Zonerama.
   - Implement as a scroll-snap track (`scroll-snap-type: x mandatory`) with the buttons scrolling by one page width; it then also works by swipe.
3. **"Další alba"** panel (green tint, green corner triangle): "Všechna starší alba farnosti jsou na Zonerama." and a green button **"Více fotogalerií na Zonerama"** with an external-link icon. In the light theme the button is `#17784A` with white text; in dark it is `#5FD394` with **dark text `#111923`** (never white on light green).

Show the 4–6 newest albums on the page; older ones live on Zonerama.

### 19.2 Data

| Field | Notes |
|---|---|
| album title, date | from Zonerama, cached about 1 h |
| photo count | for "12 fotografií" and the counter |
| photos | URLs in two sizes (thumbnail for the strip and lightbox thumbnails, large – about 1600 px – for the lightbox) and alt text (album title + "fotografie N") |
| album URL | Zonerama link for "Otevřít album" |

Photos open in the lightbox described in section 21.

### 19.3 Dark theme

Same token mapping as section 10. Placeholder tints become dark tints; the
Zonerama button uses dark text as noted above.

## 20. Secondary navigation ("Více" menu) and sitemap footer

Replaces the old site's sidebar, which listed about 30 pages on every page. The
new design has **no permanent sidebar**. Secondary pages are reached in three places:
the **"Více" menu** in the header, the **sitemap footer** on every page, and in-page links.

### 20.1 Groups (shared by the menu and the footer)

The old sidebar groups were regrouped. The old "Úvod" group duplicated the main menu,
and Historie, Pastorační rada and Společenství mladých each held only 1–2 links.

| Group (shard colour) | Links |
|---|---|
| **Farnost** (blue) | Kalendář `/kalendar` · Finanční podpora `/financni_podpora/aktualne` · Pastorační rada – členové `/pastoracni_rada/clenove` · Zápisy pastorační rady `/pastoracni_rada/zapisy` · Kronika farnosti `/kronika_prehled_udalosti` · Kněží – rodáci `/knezi_rodaci` · Odkazy `/odkazy` |
| **Život ve farnosti** (green) | Schola `/schola` · Chrámový sbor `/chramovy_sbor` · Katecheze pro děti `/katecheze_pro_deti/pravidelne` · Výuka náboženství `/vyuka_nabozenstvi` · Společenství mladých `/spolecenstvi_mladych/setkavani` · Seznam aktivit `/aktivity` |
| **Farní tábor** (magenta) | Tábor 2026 `/farni_tabor/2026` (the current year, automatic) · O táboru · Vedoucí · Kontakt · Ročníky |
| **Petrklíč a archivy** (orange) | Petrklíč – aktuální číslo `/petrklic/aktualni` · Archiv Petrklíče `/petrklic/archiv` · Archiv aktualit `/aktuality/archiv` |

The main menu items (Úvod, Aktuality, Bohoslužby, Fotogalerie, Petrklíč, Kontakty)
are not repeated in the groups. Keep the groups in **one data structure** (config or CMS)
that both the menu and the footer render from.
Group headings: a 12×16 shard in the group colour plus the bold name. Links use body
text colour, 40 px rows in the menu and 36 px in the footer.

### 20.2 "Více" menu

- **Desktop:** a text button **"Více"** with the hamburger icon, after "Kontakty" and before
  the "Ohlášky" button (`aria-expanded`, `aria-controls="vice-menu"`, blue-tint background when open).
  It opens a **full-width panel** under the header stripe: white, 1 px bottom border,
  4 group columns at content width, padding 28 / 36 px. Production: an overlay over the page
  (`position: absolute`, with a subtle shadow). Close on Esc, on a click outside and on a second click;
  return focus to the button. (The mockups push content down only because they are static.)
- **Tablet:** the existing hamburger drawer (main items as a 3-column grid of tiles) gets the
  4 groups in 4 columns under a hairline.
- **Mobile:** the drawer lists the main items, then the label "DALŠÍ STRÁNKY" and the 4 groups as
  **accordions** (`<details>/<summary>`: 52 px row, shard + name, chevron that rotates when open).
  All accordions are collapsed by default; the one containing the current page is open.
- The hamburger button gets `aria-expanded` as well.
- **Current page:** mark the link with `aria-current="page"` and the group's ink colour, bold.

### 20.3 Sitemap footer (every page)

- Stripe on top, `--surface` background, as before.
- Directly under the stripe: the **"Slovo na dnešek" quote card** (20.5).
- **Brand block:** logo + "Římskokatolická farnost Kuřim", the address "Křížkovského 55/5, 664 34 Kuřim",
  "Obce farnosti:" with links to Kuřim, Moravské Knínice, Jinačovice and Česká (the municipal websites),
  the bank account, and the link "Virtuální prohlídka kostela". (Vira.cz is linked from the quote card, 20.5.)
- **Sitemap** (`<nav aria-label="Mapa webu">`) with the 4 groups:
  desktop, brand block left (1.25 fr) + 4 columns (3.75 fr), gap 48;
  tablet, brand block above + 4 columns; mobile, brand block above + the groups as **accordions**
  (same component as the drawer).
- Bottom line (13 px, muted): "© 2026 Římskokatolická farnost Kuřim" and the link "Kontakty a úřední hodiny".

### 20.4 Dark theme

Same token mapping as section 10. The open "Více" button uses the dark blue tint `#172A40`.

### 20.5 "Slovo na dnešek" (Bible quote)

Replaces the Bible quote at the bottom of the old sidebar. It sits at the **top of the
footer on every page**, so it is visible everywhere without competing with page content.

**Look**
- A white card (`--raised` in dark), radius 24, a green corner triangle top-right. Padding 24/20 (mobile), 28/32 (tablet), 32/48 (desktop). Desktop: at content width.
- Label row: book icon + "SLOVO NA DNEŠEK" (13 px, bold, uppercase, green ink `#17784A`).
- The verse: Oxygen **300**, 19 / 22 / 26 px, line height 1.45, max-width 820 px.
- Under it: the reference (bold, green ink, e.g. "Žalm 118,24") and on the right the link **"Zdroj: www.vira.cz"** with an external-link icon.
- The mockups use Žalm 118,24 as a sample.

**Source: the vira.cz widget** ([documentation](https://www.vira.cz/servis-pro-vas/sluzby-pro-webmastery/zobrazeni-biblickeho-citatu))
- Free; the verse **changes daily**. Attribution to **www.vira.cz** with a link is a **condition of use**, which is why the card shows "Zdroj: www.vira.cz".
- Use the **server-side** variant (the one vira.cz recommends): fetch `https://www.vira.cz/biblicky-citat.php` on the server, **cache it until midnight**, and fall back to the last cached verse if vira.cz is down. Do not use the JS or iframe variant (third-party script, layout shift, iframe can't be styled).
- **Do not load their stylesheet** (`/styly/biblicky-citat.css`). Style the returned HTML with our CSS through its IDs:

| vira.cz element | Our role |
|---|---|
| `#biblicky-citat` | the card wrapper (`figure`) |
| `#biblicky-citat-na-dnesni-den` | the label row (replace the text with "Slovo na dnešek" or hide it and use ours) |
| `#biblicky-citat-text` | the verse (style as the blockquote above) |
| `#biblicky-citat-citace` | the reference (bold, green ink) |
| `#biblicky-citat-odkaz` | the attribution link to www.vira.cz (keep it visible) |

- Cleaner alternative: parse the fetched HTML on the server and render our own markup (`figure` › `blockquote` + `figcaption` › `cite` + link), keeping the www.vira.cz link.
- The `?bg=1` parameter (dark background variant) is not needed: our CSS handles the dark theme.
- The response is UTF-8 by default.

## 21. Lightbox (photos and posters)

One shared full-screen viewer, used in two places:
- **Fotogalerie** (section 19): tapping a photo in an album strip opens that album at that photo.
- **Event posters**: the poster on Detail akce (13.3) and **image** attachments ("Plakát JPG/PNG") in Aktuality and Archiv aktualit. PDF attachments keep opening in the browser's PDF viewer.
Not used for the homepage carousels.

Mockups: `mockups/lightbox-foto/` and `mockups/lightbox-plakat/` (the open state at 390×844, 834×1112 and 1440×900).
Production: a native `<dialog>` opened with `showModal()`, over the page.

### 21.1 Look (the same in the light and dark theme)
- Background `#0B1118` (near-black, about 96 % opaque over the page), white text, secondary text `#C3CCD8`, hints `#9AA6B5`.
- Round translucent buttons (`rgba(255,255,255,0.14)`, white icon): close 48 px, prev/next 56 px.
- **Top bar:** counter "3 / 12" (bold, `aria-live`) and the album title (muted, one line, ellipsis) on the left; on the right the **close** button ("Zavřít (Esc)"), and for photos "Album na Zonerama ↗" (desktop/tablet: a pill with text; mobile: an icon button).
- **Stage:** the image fitted with `object-fit: contain` (max 1040 px wide on desktop, 760 on tablet, full width on mobile).

### 21.2 Photos
- Desktop / tablet: prev/next buttons on the sides of the image; under it the caption "20. září 2026 · album title". Desktop adds a **thumbnail strip** (72×54, the current one with a white 2 px border, the others at 60 % opacity), centred on the current photo.
- Mobile: the image spans the width; under it a row "‹  date  ›" with 56 px buttons and the hint "Přejeďte prstem pro další fotografii".
- Navigation: buttons, ← / → keys, swipe; it wraps around at both ends. Preload the next and previous image.
- Update the URL hash (`#foto-3`) so the back button closes the lightbox and a link can open a specific photo.

### 21.3 Posters
- Top bar: "Plakát" and the event title; close button.
- Stage scrolls when zoomed (`overflow: auto`, drag to pan on desktop).
- Bottom toolbar: **−**, a zoom label button ("Celý" = fit to screen; then "150 %", "200 %", "300 %"; clicking it resets), **+**, and a white **"Stáhnout (PNG)"** button (`download`).
- Hints: mobile/tablet "Přibližte dvěma prsty nebo dvojitým klepnutím"; desktop "Kolečko myši nebo +/− přiblíží, tažením posunete".
- Pinch-zoom and double-tap must work on touch devices (do not block them with `touch-action: none` on the image).
- `alt` of the poster: the event title, date, time and place (the poster is often the only source of this info).

### 21.4 Accessibility and behaviour
- `role="dialog"`, `aria-modal="true"`, `aria-label` ("Fotografie z alba …" / "Plakát: …"). Focus moves to the close button on open, is trapped inside, and returns to the photo/poster that opened it.
- Close with Esc, the close button, the browser back button, and a click on the dark background outside the image.
- Lock page scroll while open. Under `prefers-reduced-motion`, no slide or zoom animations.
- Without JS, photos link to the album on Zonerama and posters to the image file, so nothing is lost.

## 22. Finanční podpora (`/financni_podpora/aktualne`)

Mockups: `mockups/financni-podpora/`. Section colour: **orange** (the same as "Podpora farnosti" on Kontakty).
Not in the main menu: reached from the "Více" menu / footer (group Farnost) and from Kontakty ("Projekty a další možnosti podpory →").

### 22.1 Structure
1. Breadcrumb, H1 "Finanční podpora", lead "Vaše dary zajišťují chod farnosti, její život a opravy kostelů a fary. Za každý příspěvek děkujeme."
2. **"Jak můžete přispět"** (orange tint panel, orange corner triangle):
   - three ways as icon rows: *Hotově* (na faře nebo v obálce do sbírky), *Při sbírce* (v kostele při bohoslužbách), *Převodem* (s variabilním symbolem projektu). Desktop: 3 columns; tablet/mobile: a list.
   - white account card: "Bankovní účet farnosti", **247704317/0300** (24/28 px), button "Zkopírovat číslo účtu" (→ "Zkopírováno"), note "Bez variabilního symbolu jde dar na běžný chod farnosti."
   - "Na požádání vystavíme potvrzení o daru pro daňové účely. Kontaktujte faru →".
3. **"Projekty 2026"** with "Stav k 30. 6. 2026" on the right. One card per project (desktop 3 columns, tablet/mobile 1 column):
   - place chip with the village colour (Kuřim blue, Moravské Knínice green), H3 title, one-line description of the planned works;
   - **progress**: "57 800 Kč z 664 679 Kč" + percentage (orange-ink) and a 12 px bar (`role="progressbar"`, orange fill on `--surface`). Progress = dary + dotace vs. rozpočet; show at least a 1.5 % sliver so a small amount is still visible;
   - a 2-column `<dl>`: Rozpočet, Dotace, Dary, and Provedené práce when known;
   - payment box (orange tint): "Účet 247704317/0300", **VS 5555**, button "Zkopírovat VS"; on tablet/desktop a **QR Platba** code (96 px, always black on white, also in the dark theme). On mobile no QR (you cannot scan your own screen).
4. **"Další možnosti podpory"** (3 surface cards; tablet 2 columns, mobile stacked):
   - *Pravidelné dary farnosti*: VS 1111, "Přijato v roce 2026 (k 30. 6.)" **95 760 Kč**, "Zkopírovat VS".
   - *Fond PULS*: description, an expandable table "Příspěvky farnosti podle let" (Rok / Předpis / Od dárců / Ze sbírky — **check the column names** against the current page), link "Přispět přes Donator.cz ↗".
   - *Pastorační aktivity děkanství Tišnov*: description, link "O projektu na Donator.cz ↗".
5. Link "Starší projekty a jejich vyúčtování →" (`/financni_podpora/starsi`, not designed yet; can reuse the project card without the payment box, with a "Dokončeno" state).

### 22.2 Data (per project)
| Field | Notes |
|---|---|
| title, place, description | plain text |
| variable symbol | e.g. 5555; also used to generate the QR Platba (SPAYD: `SPD*1.0*ACC:<IBAN>*X-VS:5555*MSG:Dar – <project>`) |
| budget, grants, gifts, work done | integers in Kč; "work done" optional |
| as-of date | "Stav k …" shown once above the cards |
| active / finished | finished projects move to Starší projekty |

Copy buttons use the Clipboard API and announce "Zkopírováno" (`aria-live`). Every copy button (here and on Kontakty, 15.1) sits **on its own line under the value** and has a **fixed minimum width** that fits its longer label (about 168 px for "Zkopírovat" / "Zkopírováno", 230 px for "Zkopírovat číslo účtu", 160 px for "Zkopírovat VS"), with the label centred, so switching the label never changes the button width or re-wraps the layout.

## 23. Odkazy (`/odkazy`)

Mockups: `mockups/odkazy/`. Section colour: blue (group Farnost). Reached from the "Více" menu and footer.

- Breadcrumb, H1 "Odkazy", lead "Užitečné stránky církve, katolických médií a obcí naší farnosti." and a small note with an external-link icon: "Odkazy vedou na jiné weby a otevírají se v novém okně."
- Links are regrouped into **four groups**, each an H2 with a shard in the group colour:
  - **Církev** (blue): Česká biskupská konference, Biskupství brněnské, Vatican News (česky), Papežská misijní díla.
  - **Média** (magenta): Katolický týdeník, Radio Proglas, Signály, Katolik.cz.
  - **Modlitba a Bible** (green): Breviář (ebreviar.cz), Bible on-line (biblenet.cz), Katechismus.
  - **Obce farnosti** (orange): Kuřim, Moravské Knínice, Jinačovice, Česká.
- **Link card** (`--surface`, radius 18, padding 16, the whole card is the link): a 44 px tile in the group tint with the initial letter in the group ink (replace with the site's favicon if you like), the name (17 px bold), a one-line description, and the domain with an external-link icon in the group ink. Grid: 1 column mobile, 2 tablet, 4 desktop.
- `target="_blank" rel="noopener"` and visually hidden "(otevře se v novém okně)", as on the current site. Use **https** URLs.
- Data: a simple list (group, name, description, URL) editable in the admin.

## 24. Výuka náboženství (`/vyuka_nabozenstvi`)

Mockups: `mockups/vyuka-nabozenstvi/`. Section colour: **green** (group Život ve farnosti).
- Breadcrumb, H1, lead "Náboženství pro děti z 1. až 9. třídy …".
- **"Rozvrh výuky"** with "Školní rok 2026/2027" on the right, and a **school switcher**: pills `ZŠ Tyršova · ZŠ Jungmannova · Moravské Knínice · Fara Kuřim` (`role="tablist"`, active = green fill with dark text). Mobile: one scrolling row.
  - Tablet/desktop: a table (Třída as a green pill, **Den**, **Hodina**, Místo, Vyučující), with a visually hidden `<caption>`.
  - Mobile: each row becomes a card: a 76 px green tile "třída 1.–2.", then "**pátek · 12:15–13:00**", the room and the teacher.
  - Without JS show all four tables one under another (each with an H3 school name); the switcher is an enhancement.
- Three cards (desktop 3 columns, tablet 2, mobile stacked):
  - **Přihláška** (green tint, corner triangle): text + green button "Přihláška do náboženství" (the current JPG; ideally a PDF or an online form) and an outline button "Zásady výuky (PDF)".
  - **Kontakt**: avatar initials, *Hanka Prokopová – pastorační asistentka*, buttons Zavolat / Napsat e-mail (real phone and e-mail from the admin; the mockup uses placeholders).
  - **Omlouvání**: short text on excusing absence, pointing to the PDF.
- Data: school → rows (class, day, time, room, teacher), school year label. Editable each September.

## 25. Seznam aktivit (`/aktivity`)

Mockups: `mockups/aktivity/`. Section colour: green.
- H1 "Seznam aktivit", lead "Co se ve farnosti děje a na koho se obrátit. MK = Moravské Knínice."
- **Search** "Hledat aktivitu nebo jméno" (matches name, contact names and frequency) and **filter pills** with counts: `Vše 60 · Pravidelné 24 · Správa a komunikace 8 · Jednorázové a roční 28` (`aria-pressed`). Count line with Czech plurals: "Zobrazena jedna aktivita / Zobrazeny 2 aktivity / Zobrazeno 5 aktivit" ("Nalezen…" while searching).
- One section per group (H2 with a shard: Pravidelné green, Správa blue, Jednorázové magenta), cards in a grid (1 / 2 / 3 columns), `--surface`, radius 18:
  - name (17 px bold); a clock row with the frequency if known ("každou neděli po mši v 10:30"); a person row with contact names;
  - **"hledáme"** (no one responsible yet) is shown in magenta ink – an invitation to help;
  - if the activity has its own page (group template, section 27, or Výuka náboženství), a link "Více o skupině →".
- Bottom panel "Chcete se zapojit?" (green tint) with a button to Kontakty.
- Contacts: show **names only**; phone/e-mail only for people who agreed (GDPR). Data: group, name, frequency, contacts, optional page link.

## 26. Kronika farnosti (`/kronika_prehled_udalosti`)

Mockups: `mockups/kronika/`. Section colour: blue.
- H1 "Kronika farnosti", lead; **era pills** `Vše · 13.–18. století · 19.–20. století · Novější opravy`.
- Each era: H2 + a **vertical timeline** (`<ol>`): a right-aligned year column (92 / 130 / 150 px), a 2 px line with dots, and the text.
  - **Milestones** (1226 first church, 1286 own parish, 1766–1772 rebuilt, 1893 organ, 2000 new façade): bigger blue-ink year, 16 px blue dot, text in a blue-tint bubble. Others: 10 px grey dot, plain text.
  - Entries are sorted by year (the current page has a few out of order: 1833, 1843).
- The mockup texts are **shortened paraphrases** – take the exact wording from the current chronicle.
- Footer note linking to the 800-year article and Kněží – rodáci.

## 27. Group page template (example: Schola, `/schola`)

Mockups: `mockups/skupina-schola/`. One template for **Schola, Chrámový sbor, Společenství mládeže, Katecheze pro děti (pravidelné)** and future groups (Ministranti, Farní kavárna …). Colour: green.
Every block is optional; a group fills only what it has.
1. Breadcrumb `Úvod › Seznam aktivit › Schola` (groups live under Seznam aktivit).
2. **Hero photo** (220 / 320 / 380 px, radius, green corner triangle), H1 and a one-sentence tagline.
3. **"O nás"** text and the **info box** "Kdy · Kde · Kontakt" (green tint, icon rows with uppercase green labels; contact name + role; buttons Zavolat / E-mail). Desktop: text left (1.6 fr), info box right (1 fr); smaller screens: text, then the box.
4. **Fotografie**: a square-thumbnail grid (6 on mobile in 3 columns, 4 on tablet, 6 on desktop) + "Zobrazit všech 18 fotografií →"; thumbnails open the **lightbox** (section 21) and zoom to 103 % on hover (motion rules in section 5). Source: a Zonerama album or uploaded photos.
5. **Video** ("Poslechněte si nás"): YouTube cards (16:9 thumbnail, play button, duration, title; the thumbnail zooms to 103 % on hover, section 5) + link to the channel. Use `youtube-nocookie.com` and load the player only after a click (privacy + speed).
6. **Další skupiny**: 3 cards linking to other groups + "Všechny aktivity farnosti →".
7. Optional **Ke stažení** block (e.g. Chrámový sbor: "Noty a nahrávky pro členy sboru" – a link to the shared folder; mark it "jen pro členy").
Data per group: name, slug, tagline, hero photo, text, when (one or more lines), where, contact (name, role, phone, e-mail), photos, videos, downloads.

### 27.1 The other group pages

All use the same template; the blocks each one uses:

| Page | Route | Blocks | Notes |
|---|---|---|---|
| **Schola** | `/schola` | hero, O nás + info box, Fotografie, Video, Další skupiny | the reference example |
| **Chrámový sbor** | `/chramovy_sbor` | hero, O nás + info box (two contacts: sbormistr Adam Janík, varhaník Jan Čáp), **Noty a nahrávky pro členy**, Další skupiny | the downloads block: 4 voice cards (Soprán, Alt, Tenor, Bas – "noty (PDF) a nahrávky (MP3)") linking to the choir's shared folder, with a magenta lock pill "Jen pro vnitřní potřebu sboru"; access is given by the choirmaster (the folder itself is protected, the page only links to it) |
| **Společenství mládeže** | `/spolecenstvi_mladych/setkavani` | hero (the group's **poster** can be the hero image), O nás + info box, **Příští setkání**, Další skupiny | "Příští setkání": a blue-tint card with a date tile (NE / 11), "Neděle 11. 10. v 18:30", place and topic, and "Všechna setkání v kalendáři →"; filled automatically from the next event of the youth calendar category; hidden when there is none |
| **Katecheze pro děti** | `/katecheze_pro_deti/pravidelne` | hero, **Pro rodiče** text + info box, **Jak to probíhá**, Fotografie (9), link card to **Mimořádné katecheze**, Další skupiny | "Jak to probíhá": 4 numbered step cards (Začátek mše → Po evangeliu → Katecheze → Obětování), 1 / 2 / 4 columns; the orange link card leads to the seasonal stories (advent, půst …) |

- The texts in these mockups are **drafts** written from the old pages (some of them now only say "Stránku připravujeme"): times, places and contacts must be confirmed by each group. Contact buttons use placeholder numbers.
- "Další skupiny" always lists the other three group pages; Seznam aktivit links each of these activities to its page ("Více o skupině →").

## 28. Finanční podpora – starší projekty (`/financni_podpora/starsi`)

Mockups: `mockups/financni-podpora-starsi/`. Colour: orange.
- Breadcrumb `Úvod › Finanční podpora › Starší projekty`, H1, lead with thanks.
- One card per project (`--surface`): place chip, green **"Dokončeno · 2019–2025"** pill, H2, one-line summary, and two totals on the right: **Náklady celkem** and **Dotace celkem** (sum of the yearly rows).
- **"Vyúčtování podle let (7)"** as `<details>` (the first project open by default; opens by height, 200 ms, section 5):
  - tablet/desktop: a table Rok / Provedené práce / Rozpočet / Dotace / Dary / **Náklady**, numbers right-aligned, no wrapping;
  - mobile: one card per year (year + costs on top, the works, then a 3-column mini `<dl>` Rozpočet / Dotace / Dary).
- "—" when a value is not recorded. Two rows for one year are allowed (fara 2020: two stages).
- Link back "← Aktuální projekty a jak přispět".

