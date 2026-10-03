---
paths:
  - "src/components/**"
  - "src/app/**"
---

# Styling and design rules

- `design/DESIGN.md` is the **source of truth**. The mockups give exact values (sizes, spacing, copy);
  never copy their structure (inline styles, three separate files).
- Tailwind CSS v4 utilities in the components. Class names: `clsx`; component variants:
  `class-variance-authority` (`cva`, see `ButtonLink`).
- Tokens live in the `@theme` block of `src/app/globals.css`. Tailwind's default palette, breakpoints,
  type scale, radii and shadows are **removed**, so only design values exist:
  colours `blue`, `blue-ink`, `magenta-tint`, `ink-2`, `muted`, …; sizes named by pixels (`text-26`,
  `rounded-24`, `shadow-card`); line heights by role (`leading-display` 1.1 … `leading-relaxed` 1.55);
  spacing is Tailwind's 4 px scale (`p-4` = 16 px, `h-13` = 52 px, `basis-60` = 240 px).
  No hard-coded hex values or arbitrary values (`leading-[1.3]`, `flex-[0_0_240px]`) in components;
  add a token or use the scale instead.
- **Mobile-first breakpoints:** no prefix = mobile, `md:` = tablet (≥ 768 px), `lg:` = desktop (≥ 1200 px).
  Use `max-md:` / `max-lg:` when a style must not leak upwards (e.g. borders with `not-first:`).
  One markup per component; breakpoint layouts use `contents`, `order-*`, grid and `hidden`/`block`.
- Custom utilities in `globals.css`: `container-page` (16/32 px gutter, max 1200 px content),
  `grid-fit-<px>` (auto-fit columns at least N px wide, e.g. `lg:grid-fit-250`),
  `shard-tl|tr|br|bl` (clip-path triangles named by their right-angle corner), `no-scrollbar`.
- Avoid `!important` (`!`) and duplicate utilities for the same property on one element.
- Section colours: blue = mass, Kontakty, primary actions · magenta = Aktuality · green = Fotogalerie · orange = Petrklíč.
- Contrast: coloured **text** uses the `*-ink` shades. Never white text on green or orange
  (the orange button has dark text).
- Font: self-hosted Oxygen via `next/font/local` (400 and 700 are registered; 300 is available).
  Oxygen has no `→` glyph, so arrows are SVG icons (`ArrowRightIcon`).
- No gradients, no emoji, no dark or sad colours. The decorative "shards" are `clip-path` triangles on `aria-hidden` spans.
