import type { NewsEvent } from "@/content/types/news";
import { atClockTime, formatEventWhen } from "@/lib/shared/czech";

// The posters of Aktuality: the WebP shown on the site and the uploaded file it was made from.

/** The poster's name after its file's: a WebP attachment would otherwise be overwritten by its own poster. */
export const POSTER_SUFFIX = "-poster.webp";

/** A file name without its extension: "/uploads/aktuality/x-plakat.pdf" → "/uploads/aktuality/x-plakat". */
const withoutExtension = (file: string) => file.replace(/\.[^./]+$/, "");

/** The poster WebP of an attachment file: "/uploads/aktuality/x-plakat.pdf" → "/uploads/aktuality/x-plakat-poster.webp". */
export const posterOf = (file: string) => withoutExtension(file) + POSTER_SUFFIX;

/** The name (without its extension) of the file a poster WebP was made from: before `-poster.webp`, or `.webp`. */
const posterSource = (src: string) => src.replace(/(-poster)?\.webp$/, "");

/** Whether the poster `src` was made from `file`: named `<file>-poster.webp`, or `<file>.webp` before that name. */
export const isPosterOf = (src: string, file: string) => posterSource(src) === withoutExtension(file);

/**
 * What the detail page's poster opens full size: the poster's original (its file is named like the poster WebP, before
 * `.webp` or, since `pnpm stage aktualita` names posters `<file>-poster.webp`, before `-poster.webp`), else the
 * "Plakát" attachment, else the WebP itself. Undefined without a poster or a "Plakát" attachment.
 */
export function posterHref(event: NewsEvent): string | undefined {
  const attachments = event.attachments ?? [];
  const base = event.poster && `${posterSource(event.poster.src)}.`;
  const original =
    attachments.find((a) => base && a.file.startsWith(base)) ?? attachments.find((a) => a.label === "Plakát");
  return original?.file ?? event.poster?.src;
}

/**
 * Alt text of a poster in the lightbox (design/DESIGN.md §21.3), which is often the only source of the details:
 * "Plakát: Farní den, neděle 18. října 2026 v 9:30, farní zahrada".
 */
export function posterAlt(event: NewsEvent): string {
  const when = formatEventWhen(event, { longMonth: true });
  return [`Plakát: ${event.title}`, when.time ? `${when.date} ${atClockTime(when.time)}` : when.date, event.place]
    .filter(Boolean)
    .join(", ");
}
