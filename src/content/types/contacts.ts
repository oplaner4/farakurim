import type { ChurchColor } from "./services";
import type { ClockTime, MonthDay, Weekday } from "./shared";

// Kontakty (masses.ts, site.ts): the churches and chapels and the office hours.

/** A church or chapel of one of the parish's villages ("Kostely a kaple" on Kontakty, design/DESIGN.md §15.1). */
export type ParishChurch = {
  village: string;
  /** "Chrám Páně sv. Maří Magdaleny", "Kaple Panny Marie Růžencové" */
  building: string;
  /** "bohoslužby dle domluvy" */
  note?: string;
  /** Bar colour: the place's colour, magenta for Česká. */
  color: ChurchColor | "magenta";
  /** Mapy.cz search. */
  mapQuery: string;
};

/** A weekly office-hours slot (§15.2). */
export type OfficeHours = {
  weekday: Weekday;
  from: ClockTime;
  to: ClockTime;
  note?: string;
  /** Yearly break, e.g. the summer holidays: the slot does not apply from `from` to `to` (inclusive). */
  closed?: { from: MonthDay; to: MonthDay };
};
