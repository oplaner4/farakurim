// The weeks of a service sheet written as the commit message names them ("19.–25. 10. 2026", "26. 10.–1. 11. 2026").

import type { IsoDate } from "@/content/types/shared";
import type { Week } from "../services/sheet-week";

const parts = (date: IsoDate) => ({
  day: Number(date.slice(8, 10)),
  month: Number(date.slice(5, 7)),
  year: Number(date.slice(0, 4)),
});

/** `19.–25. 10.`, `26. 10.–1. 11.` or `28. 12. 2026–3. 1.`: a week without the year it ends in. */
function weekWithoutYear({ validFrom, validTo }: Week): string {
  const from = parts(validFrom);
  const to = parts(validTo);
  const end = `${to.day}. ${to.month}.`;
  if (from.year !== to.year) return `${from.day}. ${from.month}. ${from.year}–${end}`;
  if (from.month !== to.month) return `${from.day}. ${from.month}.–${end}`;
  return `${from.day}.–${end}`;
}

/**
 * The weeks as a commit message names them, oldest first: `19.–25. 10. 2026`, or
 * `19.–25. 10. and 26. 10.–1. 11. 2026` with the year once when every week ends in the same one.
 */
export function formatWeeks(weeks: Week[]): string {
  const sorted = [...weeks].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const years = new Set(sorted.map((week) => parts(week.validTo).year));
  const labels = sorted.map((week, i) =>
    years.size > 1 || i === sorted.length - 1
      ? `${weekWithoutYear(week)} ${parts(week.validTo).year}`
      : weekWithoutYear(week),
  );
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : (labels[0] ?? "");
}
