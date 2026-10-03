# farakurim.cz – redesign (handoff)

Spec for implementing the new website of **Římskokatolická farnost Kuřim**.
Pages designed so far: **homepage** (sections 1–10), **Aktuality** (section 11),
**Archiv aktualit** (section 12), **Detail akce** (section 13), **Pořad bohoslužeb**
(section 14), **Kontakty** (section 15) and **Kalendář** (section 16, plus the
homepage week calendar in 4.3a).
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
as an example detail URL, `/porad_bohosluzeb`, `/kontakty`, `/kalendar`); the theme toggle's `href="#"` stands for the JS toggle.

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
  Mobile/tablet: arrows and dots in a row near the bottom (above the overlapping card). Desktop: dots bottom-left, arrows bottom-right.

### 4.3 Next mass ("Nejbližší mše svatá"), the most important block
- A white card. **Mobile/tablet:** overlaps the carousel (negative top margin −44 / −72). **Desktop:** sits beside the carousel (flex-wrap row: carousel `flex: 999 1 560px`, card `flex: 1 1 380px`).
- Content: eyebrow, day line ("Zítra · neděle 4. 10."), **huge time** in blue, place plus church with a pin icon, a **countdown** (3 tiles: days / hours / minutes, Czech plurals), a "Následující bohoslužby" list (next 2), the primary button **"Pořad bohoslužeb (PDF)"**, and the caption "Ohlášky na týden …".
- Tablet: two columns inside the card (time and button left, countdown and list right).
- Desktop: the PDF button lives in the header; the card ends with the link "Pravidelné bohoslužby a ohlášky →".
- The countdown can be switched off (it's an optional feature).

### 4.3a "Tento týden" week calendar (blue)

Placed **directly after the next-mass block and before Aktuality**. The parish
considers the calendar essential, so it is the second thing visitors see.

- Heading "Tento týden" with the blue shard (26 / 32 / 40 px) and the link "Celý kalendář" to `/kalendar`.
- **7 day cards**, today and the next 6 days, as an ordered list. Each card has:
  - a header: "Dnes" / "Zítra" / weekday, with the date muted on the right ("so 3. 10.", "5. 10.");
  - **events** (Události calendar), each with a 4 px magenta bar, the time ("celý den", "18:30") in magenta-ink, and the title in bold, linked when the event has a detail page;
  - **one compact services line** (Mše a adorace calendar): a blue bar, the label "Bohoslužby" and the times joined with " · " ("8:00 · 9:30 · 11:00");
  - "Bez programu" when the day is empty.
- Today's card has a blue-tint background with a 2 px blue border; other days use `--surface`.
- Layout: mobile, a horizontal scroll row of 200 px cards (bleeds to the screen edges); tablet, the same with 210 px cards; desktop, `grid-template-columns: repeat(7, minmax(0, 1fr))`.
- Data: the same source as the Kalendář page (16.4). Render server-side.

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
- The **card title is a link** to the event's detail page (section 13). Keep the attachment and link buttons as separate targets; don't make the whole card one link.

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

## 12. Archiv aktualit (`/aktuality/archiv`)

Mockups: `mockups/archiv/`. A compact, searchable list of finished events. It
replaces the old archive with its "Vytvořeno" dropdown and `takeCount` /
`archived=1` parameters.

### 12.1 Structure

1. Breadcrumb `Úvod › Aktuality › Archiv`, H1 "Archiv aktualit" (32 / 42 / 52 px) with the magenta shard, one-line intro "Proběhlé akce, pozvánky a plakáty farnosti."
2. **Search and year filter.** Mobile: stacked. Tablet: one surface panel with the search box and the year buttons side by side. Desktop: a **left side panel** (`flex: 1 1 280px`) next to the list (`flex: 999 1 600px`), with "Zpět na aktuality" at its bottom.
3. Result count ("Zobrazeno 21 akcí" / "Nalezeno 3 akce", `aria-live="polite"`) and, while searching, a "Zrušit hledání" text button.
4. **List grouped by month, newest first** ("Srpen 2026", "Červenec 2026"…; magenta-ink H2 18 / 20 / 22 px).
5. "Načíst starší" (magenta outline) and "Zpět na aktuality".

### 12.2 Search and years

- `<label>` "Hledat v archivu" plus `<input type="search">` (50 px tall, radius 14, border `#7D8A9B`, which meets the 3:1 boundary contrast; magnifier icon inside on the left). Placeholder "např. pouť, koncert, Tišnov".
- Search looks in the **title and place across all years**. While a search is active, no year is selected.
- Year buttons: `2026 · 2025 · Starší`, each with its count in a lighter weight. Active: magenta with white text. Default: the year of the most recent archived event. Mobile: three equal-width pills. Desktop: full-width vertical list.
- Implement as a GET form plus links: `?q=…`, `?rok=2025`, `?rok=starsi`. Without JS, the form submits. With JS, debounce about 250 ms and update the list in place.
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

20 rows per page. "Načíst starší" links to `?strana=2` and keeps `q` / `rok`.
The archive uses the same event record as section 11.7. An event appears in the
archive the day after its end date. A manual "archived" flag is no longer needed,
though an admin may still hide an event.

## 13. Detail akce (`/aktuality/<slug>`)

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
- **"Přidat do kalendáře"**: magenta filled button, 52 px. It downloads an `.ics` file (`/aktuality/<slug>.ics`) with title, start/end, place and the page URL. This is a new feature.
- **"Sdílet"**: magenta outline button. It uses `navigator.share()` where available, and otherwise copies the URL and shows "Odkaz je zkopírovaný." (`role="status"`).

### 13.3 Content blocks

- **O akci**: the event's body text (rich text: paragraphs, bold, links, lists). H2 22 / 26 / 28.
- **Program** (optional): an ordered list of rows `time | title + note`, with the time column in magenta-ink, 76 / 100 / 120 px wide.
- **Highlight tiles** (optional, used here as "800 let v datech"): up to 3 tiles, each in one brand tint (green, blue, orange) with its shard top-right, a big number in that colour's ink and a short label. Use them only when the event really has key facts or numbers.
- **Přílohy**: one row per file with the file icon, name and "TYPE · size".
- **Poster**: full poster with `object-fit: contain` and a "Plakát v plné velikosti" link. Mobile: 240×340, centred.

### 13.4 Data each event needs (in addition to 11.7)

| Field | Notes |
|---|---|
| slug | URL part, generated from the title, editable |
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
2. **"Tento týden" panel**: blue tint, blue and green triangles top-right.
   - Eyebrow "Tento týden", H2 "Ohlášky 27. 9. – 4. 10. 2026", blue button **"Stáhnout ohlášky (PDF)"**.
   - **"Změny tento týden"** box (orange tint, warning icon, orange-ink heading): a bullet list of this week's deviations from the regular schedule ("**Ne 4. 10.** – druhá mše v Kuřimi až v 11:00").
   - "Svátost smíření tento týden": one line (mobile/tablet) or a small white card (desktop).
   - Layout: stacked on mobile; two columns on tablet; on desktop the PDF block sits left and the two boxes right.
3. **"Pravidelné bohoslužby"**: H2, a muted note "Dnes je sobota · změny vždy v ohláškách", day filter (14.2), church cards (14.3).
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
| sacrament notes | smíření text, křty text |

The homepage "next mass" countdown (section 5) uses the same regular services plus
this week's changes. One data source feeds both pages.

## 15. Kontakty (`/kontakty`)

Mockups: `mockups/kontakty/`. Section colour: **blue**. The header's current item is "Kontakty".

### 15.1 Blocks

| Block | Content |
|---|---|
| **Fara** (blue tint, blue and green triangles) | eyebrow "Fara", H2 "Římskokatolická farnost Kuřim", `<address>` Křížkovského 55/5, 664 34 Kuřim; buttons **Zavolat** (`tel:+420541230183`, filled) and **Napsat e-mail** (outline); map (placeholder; production: a static map image or Mapy.cz embed, lazy-loaded) with the link "Navigovat na Mapy.cz →" |
| **Úřední hodiny** | live **status line** (see 15.2); rows Pondělí 9:00–10:00 · Čtvrtek 19:00–20:00 (note "mimo letní prázdniny") · Jindy dle domluvy; today's row gets the blue tint |
| **Duchovní správce** | round photo 88 px (placeholder), PhDr. ThLic. Ing. Jaroslav Filka, "duchovní správce farnosti" (**confirm the title**); `<dl>` Fara 541 230 183 · Mobil 723 661 146 · E-mail fara.kurim@seznam.cz, all as links |
| **Naše kostely** | 3 rows, each a link to Mapy.cz: colour bar (blue/green/orange), place bold, church name muted, "Mapa →"; then "Pořad bohoslužeb →" |
| **Podpora farnosti** (orange tint, orange triangle) | "Bankovní účet farnosti", **247704317/0300** at 24 px, button **Zkopírovat** that switches to "Zkopírováno" (Clipboard API, `aria-live`) |
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
| **Mše, adorace** | blue `#1D71B7` | "Mše a adorace" / "Bohoslužby", counted as "3× mše" in the grid |
| **Události** | magenta `#D60B51` | "Události" / "Akce", event titles shown as labels in the grid |

### 16.2 Structure

1. Breadcrumb `Úvod › Kalendář`, H1 "Kalendář", lead "Bohoslužby i farní akce na jednom místě. Klepněte na den a uvidíte program."
2. **Toolbar**:
   - previous/next month buttons (44 px, `aria-label`), month label as H2 (`aria-live="polite"`), and a "Dnes" button;
   - two **filter toggles** (`aria-pressed`): "Mše a adorace" (blue outline, filled when on) and "Události" (magenta), both on by default.
3. **Month grid**, weeks starting Monday, with Po–Ne headers:
   - **Mobile** (52 px cells): the day number plus up to two dots, blue for services and magenta for events.
   - **Tablet / desktop** (104 / 118 px cells): the day number, at most **two badge rows** (magenta tint, ellipsis), and "3× mše" at the bottom in blue-ink. A day with more than two events shows its first event and then a **"+N další" badge** in the same style (e.g. "+2 další" for three events), so the cell never overflows. Badges don't shrink (`flex: none`).
   - Days outside the month use `--surface` and muted text. **Today** has a 2 px blue border. The **selected day** is filled blue with white text; its event labels turn white with `#8F0634` text.
   - Each cell is a `<button>` with a full `aria-label` ("18. října, 2 bohoslužby, 1 akce") and `aria-pressed` for the selected day.
4. **Day detail** (surface panel): the heading "Dnes · Sobota 3. října" / "Zítra · …" / "Neděle 18. října". One row per item: colour bar, time ("celý den" first), title (a link when there is a detail page), "place · Bohoslužba/Akce". Empty: "V tento den není v kalendáři nic."
5. **"Kalendář v telefonu"** (blue tint): subscribe buttons "+ Mše a adorace" (blue) and "+ Události" (magenta), plus a link to the regular schedule. **The Google Calendar subscription URLs are still to be filled in.**

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
  - **Manželské večery:** the "7 setkání" are spread over the Sundays 11. 10. – 22. 11.
  - **Jubilee and Hubertská masses:** both are drawn as events that replace the regular 9:30 Sunday mass.
- An event links to its detail page (section 13) when the website has a matching Aktuality record, for example by storing the Google event ID on the record.

### 16.5 Dark theme

Same mapping as section 10. Cell background `--raised` (`#1F2B3D`), days outside the
month `--surface`, selected day stays blue.
