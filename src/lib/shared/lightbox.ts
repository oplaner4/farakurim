import { fileType } from "./czech";

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

const IMAGE_TYPES = new Set(["PNG", "JPG", "JPEG", "WEBP", "GIF", "AVIF"]);

/** An image opens in the lightbox; anything else (a PDF) opens in the browser. */
export const isImageFile = (file: string) => IMAGE_TYPES.has(fileType(file));

/**
 * First index of the thumbnail strip: `size` thumbnails centred on `index` (0-based), shifted to stay inside
 * the album.
 */
export const thumbStart = (index: number, count: number, size: number) =>
  Math.max(0, Math.min(count - size, index - Math.floor(size / 2)));
