import { addDays } from "date-fns";
import type { OfficeHours } from "@/content/types/contacts";
import type { IsoDate } from "@/content/types/shared";
import { inYearlyBreak } from "@/lib/shared/yearly-break";
import { inPrague, pragueDate, pragueDateTime, pragueWeekday } from "@/lib/shared/prague";

/** Whether a slot applies on a date: its weekday, outside its yearly break (which may wrap over New Year). */
export function officeHoursApply(slot: OfficeHours, date: IsoDate): boolean {
  if (pragueWeekday(date) !== slot.weekday) return false;
  if (!slot.closed) return true;
  return !inYearlyBreak(date, slot.closed);
}

const shiftDate = (date: IsoDate, days: number) =>
  pragueDate(addDays(pragueDateTime(date, "12:00"), days, { in: inPrague }));

/**
 * The days a slot with a yearly break applies between two breaks: the season that runs on `today`, or the next one
 * when `today` is in the break. "07-01"–"08-31" on 14. 10. 2026 → 1. 9. 2026 – 30. 6. 2027.
 */
export function openSeason(closed: NonNullable<OfficeHours["closed"]>, today: IsoDate): { from: IsoDate; to: IsoDate } {
  const year = Number(today.slice(0, 4));
  const seasons = [year - 1, year, year + 1].map((y) => {
    const from = shiftDate(`${y}-${closed.to}`, 1);
    const nextBreak = `${y}-${closed.from}` > from ? `${y}-${closed.from}` : `${y + 1}-${closed.from}`;
    return { from, to: shiftDate(nextBreak, -1) };
  });
  return seasons.find((season) => season.to >= today)!;
}

export type OfficeStatus = { open: boolean; text: string };

/** The live status line of the Kontakty page (design/DESIGN.md §15.2), by Prague time. */
export function officeStatus(hours: OfficeHours[], now: number): OfficeStatus {
  const today = pragueDate(now);
  const slots = hours.filter((slot) => officeHoursApply(slot, today));
  if (slots.length === 0) {
    return { open: false, text: "Dnes nejsou úřední hodiny. Zavolejte nebo napište, domluvíme se." };
  }
  const span = (slot: OfficeHours) => ({
    start: pragueDateTime(today, slot.from).getTime(),
    end: pragueDateTime(today, slot.to).getTime(),
  });
  const current = slots.find((slot) => {
    const { start, end } = span(slot);
    return now >= start && now < end;
  });
  if (current) return { open: true, text: `Kancelář je právě otevřená (do ${current.to}).` };
  const next = slots.find((slot) => now < span(slot).start);
  if (next) return { open: false, text: `Dnes otevřeno ${next.from}–${next.to}.` };
  return { open: false, text: "Dnešní úřední hodiny už skončily." };
}
