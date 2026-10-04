import type { OfficeHours } from "@/content/types/contacts";
import type { IsoDate } from "@/content/types/shared";
import { pragueDate, pragueDateTime, pragueWeekday } from "@/lib/shared/prague";

/** Whether a slot applies on a date: its weekday, outside its yearly break (which may wrap over New Year). */
export function officeHoursApply(slot: OfficeHours, date: IsoDate): boolean {
  if (pragueWeekday(date) !== slot.weekday) return false;
  if (!slot.closed) return true;
  const day = date.slice(5);
  const { from, to } = slot.closed;
  const inBreak = from <= to ? day >= from && day <= to : day >= from || day <= to;
  return !inBreak;
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
