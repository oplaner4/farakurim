import type { Place, PlaceId, RegularMass, ScheduleException, ServiceSheet } from "./types";

// Mock content. Replace with data from the CMS/API once the backend exists.

export const places: Record<PlaceId, Place> = {
  kurim: { name: "Kuřim", church: "kostel sv. Maří Magdalény" },
  "moravske-kninice": { name: "Moravské Knínice", church: "kostel sv. Markéty" },
};

/** Regular weekly schedule (source: /porad_bohosluzeb/). Variants go to `scheduleExceptions`. */
export const regularMasses: RegularMass[] = [
  { weekday: 1, time: "8:00", place: "kurim" },
  { weekday: 4, time: "18:00", place: "kurim", note: "adorace od 17:30" },
  { weekday: 5, time: "16:45", place: "kurim" },
  { weekday: 5, time: "18:00", place: "moravske-kninice" },
  { weekday: 0, time: "8:00", place: "kurim" },
  { weekday: 0, time: "9:30", place: "kurim" },
  { weekday: 0, time: "11:00", place: "moravske-kninice" },
];

/** Days that differ from the regular schedule: first Fridays/Saturdays and changes from the ohlášky. */
export const scheduleExceptions: ScheduleException[] = [
  {
    date: "2026-10-02",
    reason: "1. pátek v měsíci",
    masses: [
      { time: "17:00", place: "moravske-kninice" },
      { time: "18:15", place: "kurim" },
    ],
  },
  { date: "2026-10-03", reason: "1. sobota v měsíci", masses: [{ time: "8:00", place: "kurim" }] },
  {
    date: "2026-10-04",
    reason: "změna dle ohlášek",
    masses: [
      { time: "8:00", place: "kurim" },
      { time: "9:30", place: "moravske-kninice" },
      { time: "11:00", place: "kurim" },
    ],
  },
  {
    date: "2026-11-06",
    reason: "1. pátek v měsíci",
    masses: [
      { time: "17:00", place: "moravske-kninice" },
      { time: "18:15", place: "kurim" },
    ],
  },
  { date: "2026-11-07", reason: "1. sobota v měsíci", masses: [{ time: "8:00", place: "kurim" }] },
  {
    date: "2026-12-04",
    reason: "1. pátek v měsíci",
    masses: [
      { time: "17:00", place: "moravske-kninice" },
      { time: "18:15", place: "kurim" },
    ],
  },
  { date: "2026-12-05", reason: "1. sobota v měsíci", masses: [{ time: "8:00", place: "kurim" }] },
];

export const serviceSheet: ServiceSheet = {
  pdfUrl: "https://farakurim.cz/nahrane/porady_bohosluzeb/6ab9325f1b46d.porad_bohosluzeb.pdf",
  validFrom: "2026-09-27",
  validTo: "2026-10-04",
};
