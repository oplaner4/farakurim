import { isMatch } from "date-fns";
import { places } from "./masses";

// Shared checks of the content tests (`<domain>.test.ts` beside each content file). They guard the content the
// farnost-create-* skills write from posters and PDFs: a typo there does not break the build, it quietly shows the
// wrong thing (an event without its time, a missing poster, a misplaced album).

export const isIsoDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && isMatch(date, "yyyy-MM-dd");
export const isClock = (time: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(time);
export const isMonthDay = (date: string) => /^\d{2}-\d{2}$/.test(date) && isMatch(`2024-${date}`, "yyyy-MM-dd");
export const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const isPlaceId = (place: string) => Object.hasOwn(places, place);
export const duplicates = (values: unknown[]) => values.filter((v, i) => values.indexOf(v) !== i);
/** Every adjacent pair is in order (`ordered(a, b)` true), so the list is sorted. */
export const isSorted = <T>(list: T[], ordered: (a: T, b: T) => boolean) =>
  list.every((item, i) => i === 0 || ordered(list[i - 1], item));
export const UPLOAD = /^\/uploads\/[^\s]+\.(pdf|png|jpe?g|webp|mp3)$/;
/** The root-relative hrefs of an HTML text: the site's own pages and its uploaded files. */
export const localHrefs = (html: string) => [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
