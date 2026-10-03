# farakurim.cz – redesign (handoff)

Spec for implementing the new website of **Římskokatolická farnost Kuřim**.
Pages designed so far: **homepage** (sections 1–10) and **Aktuality** (section 11).
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
(`/`, `/aktuality/`); the theme toggle's `href="#"` stands for the JS toggle.

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
- **Tablet:** a "Pořad bohoslužeb" blue button plus the hamburger; the menu opens as a 3-column grid of pills.
- **Desktop:** an inline nav (Úvod · Aktuality · Bohoslužby · Fotogalerie · Petrklíč · Kontakty), the current page as a blue-tint pill with `aria-current="page"`, and a blue "Pořad bohoslužeb" button with a file-download icon.

### 4.2 Hero carousel
- 7 photos, **different file per breakpoint**: `/assets/img/pozadi/{sm|md|lg}/{1-7}.webp`.
- Height: 300 (mobile, full-bleed), 420 (tablet, full-bleed), 540 (desktop, rounded 32, left column).
- Controls: prev/next round buttons (white 92 %) and a white pill holding 7 dots; the active dot is a 24 px blue bar, inactive dots are 8 px circles.
  Mobile/tablet: arrows and dots in a row near the bottom (above the overlapping card). Desktop: dots bottom-left, arrows bottom-right.

### 4.3 Next mass ("Nejbližší mše svatá"), the most important block
- A white card. **Mobile/tablet:** overlaps the carousel (negative top margin −44 / −72). **Desktop:** sits beside the carousel (flex-wrap row: carousel `flex: 999 1 560px`, card `flex: 1 1 380px`).
- Content: eyebrow, day line ("Zítra · neděle 4. 10."), **huge time** in blue, place plus church with a pin icon, a **countdown** (3 tiles: days / hours / minutes, Czech plurals), a "Následující bohoslužby" list (next 2), the primary button **"Pořad bohoslužeb (PDF)"**, and the caption "Ohlášky na týden …".
- Tablet: two columns inside the card (time and button left, countdown and list right).
- Desktop: the PDF button lives in the header; the card ends with the link "Pravidelné bohoslužby a ohlášky →".
- The countdown can be switched off (it's an optional feature).

### 4.4 Aktuality (magenta)
- The 3 nearest events on mobile, 4 on tablet/desktop. "Všechny aktuality" link to `/aktuality/`.
- **Mobile/tablet:** a horizontal card with a date block (64–72 px; magenta fill for the highlighted item, white otherwise) plus title and excerpt. Tablet uses a 2×2 grid.
- **Desktop:** vertical cards with a poster image (210 px tall, rounded 24) and a date chip overlaid top-left, then title and excerpt. `repeat(auto-fit, minmax(min(250px,100%),1fr))`.
- "Právě probíhá" pill when today falls between the event's start and end. The highlighted card uses the magenta tint background.

### 4.5 Fotogalerie (green)
- The 4 newest albums: photo, date (muted), title. Link "Celá fotogalerie".
- Mobile: horizontal scroll row of 240 px cards. Tablet: 2×2 grid (photo 220). Desktop: 4 columns (photo 240).

### 4.6 Petrklíč (orange) and Kontakty (blue)
- Mobile: two stacked blocks. Tablet: side by side (2 columns). Desktop: `auto-fit, minmax(min(440px,100%),1fr)`.
- **Petrklíč:** orange-tint panel, cover thumbnail (portrait about 1:1.41, white, shadow), eyebrow "Farní zpravodaj", title "Petrklíč 1/2026", one-line description, orange button **"Číst Petrklíč (PDF)"** (dark text), link "Archiv starších čísel".
- **Kontakty:** blue-tint panel with icon rows: address, phones, email, úřední hodiny. Outline button or link "Všechny kontakty" to `/kontakty`. Desktop shows the rows in a 2-column grid.

### 4.7 Footer
- Stripe on top, surface background. Logo plus "Římskokatolická farnost Kuřim", the line "Kuřim · Moravské Knínice · Jinačovice · Česká", bank account, link "Virtuální prohlídka kostela".

## 5. Behaviour

### Carousel
- Prefer a CSS scroll-snap track (`overflow-x:auto; scroll-snap-type:x mandatory`) plus small vanilla JS for arrows, dots and optional autoplay.
- `<picture>` per slide: `lg` at `(min-width:1200px)`, `md` at `(min-width:768px)`, and `sm` as the `<img>` fallback.
- Slide 1 `fetchpriority="high"`, others `loading="lazy"`. Meaningful `alt` per photo.
- Autoplay (if any) pauses on hover and focus, and is off under `prefers-reduced-motion`.
- Buttons have `aria-label` ("Předchozí fotografie", "Další fotografie", "Fotografie N"); the active dot has `aria-current="true"`.

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
| Fotogalerie | Zonerama `FarnostKurim/425053`, cached server-side (about 1 h), with album title, date, cover |
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
   - Eyebrow "Doporučujeme" (uppercase, magenta-ink), H2 title 26 / 32 / 44 px, date and place rows with calendar and pin icons (magenta-ink), description, magenta button "Plakát" / "Zobrazit plakát".
   - The pinned event is **not repeated** in the list below. No pinned event means the panel is not rendered.
4. **Filters and count**: see 11.3.
5. **Grouped event list**: see 11.4 and 11.5.
6. **"Načíst další aktuality"**: magenta outline button (52 px). Full-width on mobile, centred on larger screens. See 11.6.
7. **"Archiv aktualit" panel**: surface background, heading, one line "Starší pozvánky a ohlédnutí za proběhlými akcemi.", link or outline button "Otevřít archiv". **The archive URL is still to be decided** (the mockup uses `/aktuality/`).

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
- Count: "Zobrazeno N akcí" with `aria-live="polite"`. Plural: 1 akce, 2–4 akce, 5+ akcí.
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
  - `past` "Proběhlo": surface / ink-2
- **Meta**: the full date/time text ("pátek 2. – neděle 4. 10. 2026", "neděle 25. 10. 2026 · 9:30") and the place with a pin icon.
- **Text**: a short description (aim for 1–2 sentences, clamp to 3 lines on mobile).
- **Actions** (44 px, surface fill, radius 12):
  - attachments: file icon in magenta-ink, label plus type in muted ("Plakát PNG", "Pozvánka PDF");
  - external links and e-mail: arrow-out icon in blue-ink.
- **Poster thumbnail**: rendered with `object-fit: contain` on the event's tint, so portrait posters are never cropped. Dark theme: add 8–12 px padding (section 10).
- There is **no event detail page yet**. Cards don't link anywhere except their actions. Decide whether to add a detail page before implementing.

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
| tags | price, registration deadline (date), series count, free label |
| long-term | boolean, or derived (e.g. a weekly series, or duration > 31 days) |
| pinned | boolean; at most one pinned event is shown in "Doporučujeme" |

"Právě probíhá" and "Proběhlo" are **computed** from start/end and today, never stored.

### 11.8 Dark theme

Same mapping as section 10. The new pieces map as follows:
- featured panel: `--magenta-tint`;
- featured poster shadow: light `rgba(214,11,81,.12)` becomes `--shadow`;
- cards: `--raised`;
- chips: inactive `--surface` with `--line` border, active magenta with white text.

The mockups in `mockups/aktuality/dark/` show the result.
