import { fileType } from "./czech";
import { IMAGE_EXTENSIONS } from "./uploads";

// The photo and poster lightbox (design/DESIGN.md §21).

/** Zoom stops of the poster toolbar: "Celý" (fit to the screen), then 150, 200 and 300 %. */
export const ZOOM_STEPS = [1, 1.5, 2, 3] as const;

/** The poster zoom label: "Celý" at the fitted size, else "150 %" (wheel and pinch zoom give any value). */
export const zoomLabel = (zoom: number) => (zoom < 1.01 ? "Celý" : `${Math.round(zoom * 100)} %`);

/** The next zoom stop above (`+1`) or below (`-1`) the current zoom, clamped to the first and last stop. */
export function zoomStep(zoom: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((z) => z > zoom + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return ZOOM_STEPS.findLast((z) => z < zoom - 0.01) ?? ZOOM_STEPS[0];
}

/** An image opens in the lightbox; anything else (a PDF) opens in the browser. */
export const isImageFile = (file: string) => IMAGE_EXTENSIONS.includes(`.${fileType(file).toLowerCase()}`);

/**
 * First index of the thumbnail strip: `size` thumbnails centred on `index` (0-based), shifted to stay inside
 * the album.
 */
export const thumbStart = (index: number, count: number, size: number) =>
  Math.max(0, Math.min(count - size, index - Math.floor(size / 2)));

/**
 * Hash of the N-th photo (1-based) open in the lightbox of a page with one set of photos (a group page, Vedoucí):
 * "#foto-3".
 */
export const photoHash = (n: number) => `#foto-${n}`;

/** The photo (0-based) a hash opens, or `null` when it is not one of the `count` photos. */
export function photoFromHash(hash: string, count: number): number | null {
  const match = /^#foto-(\d+)$/.exec(hash);
  const n = match ? Number(match[1]) : 0;
  return n >= 1 && n <= count ? n - 1 : null;
}
