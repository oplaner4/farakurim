import { isMatch } from "date-fns";
import { CLOCK } from "@/lib/shared/clock";

// Shared checks of the content tests (`<domain>.test.ts` beside each content file in src/content/). They guard the content the
// parish-create-* skills write from posters and PDFs: a typo there does not break the build, it quietly shows the
// wrong thing (an event without its time, a missing poster, a misplaced album).

export const isClock = (time: string) => CLOCK.test(time);
export const isMonthDay = (date: string) => /^\d{2}-\d{2}$/.test(date) && isMatch(`2024-${date}`, "yyyy-MM-dd");
/** The paths of the problems a content schema's `safeParse()` found, "" for the root; none when it passed. */
export const problemPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.path.join("."));
export const duplicates = (values: unknown[]) => values.filter((v, i) => values.indexOf(v) !== i);
/** Every adjacent pair is in order (`ordered(a, b)` true), so the list is sorted. */
export const isSorted = <T>(list: T[], ordered: (a: T, b: T) => boolean) =>
  list.every((item, i) => i === 0 || ordered(list[i - 1], item));
/** The root-relative hrefs of an HTML text: the site's own pages and its uploaded files. */
export const localHrefs = (html: string) => [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
