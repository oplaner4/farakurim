import { addMinutes, addMonths, eachDayOfInterval } from "date-fns";
import { SITE_URL, links } from "@/content/site";
import { PLACE_IDS } from "@/content/types/services";
import type {
  Place,
  PlaceId,
  RegularService,
  ScheduleException,
  ServiceEntry,
  ServiceSheetRecord,
} from "@/content/types/services";
import type { ClockTime, IsoDate } from "@/content/types/shared";
import type { DateRange } from "@/lib/calendar/agenda";
import { servicesOnDate } from "@/lib/services/masses";
import { isChangedMass, scheduleExceptions } from "@/lib/services/service-sheet";
import { clockMinutes } from "@/lib/shared/clock";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { pragueTime, type GoogleEventBody } from "./google-body";

// What the Bohoslužby calendar should hold: one Google event per service of the next six months, as the Pořad
// bohoslužeb page and the Kalendář show them, and a "Zrušeno: " one for a regular service a sheet or an exception drops.

export type ServicesContent = {
  regular: RegularService[];
  /** Sorted by `validFrom`. */
  sheets: ServiceSheetRecord[];
  later: ScheduleException[];
  places: Record<PlaceId, Place>;
};

export type DesiredService = {
  googleId: string;
  date: IsoDate;
  time: ClockTime;
  place: PlaceId;
  status: "regular" | "changed" | "cancelled";
  /** The summary, location, description, start and end. */
  body: GoogleEventBody;
};

/** The marker on the last line of every generated event's description. */
export const SERVICES_URL = `${SITE_URL}${links.services}`;

const WINDOW_MONTHS = 6;
const DEFAULT_MINUTES = 60;
const MASS_TITLE = "Mše svatá";
const STATUS_PREFIXES: Record<DesiredService["status"], string> = {
  regular: "",
  changed: "Změna: ",
  cancelled: "Zrušeno: ",
};
const STATUS_LINES: Record<DesiredService["status"], string | undefined> = {
  regular: undefined,
  changed: "Změna oproti pravidelnému pořadu bohoslužeb.",
  cancelled: "Tato bohoslužba se nekoná.",
};

/** A deterministic Google id: lowercase hex of the key, so it never collides with an Události id (`<id>/<key>`). */
export const serviceEventId = (date: IsoDate, time: ClockTime, place: PlaceId, title = ""): string =>
  Buffer.from(`services/${date}/${time}/${place}/${title}`, "utf8").toString("hex");

/** From today to six months ahead, in Prague. */
export const servicesWindow = (today: IsoDate): DateRange => ({
  from: today,
  to: pragueDate(addMonths(pragueDateTime(today, "12:00"), WINDOW_MONTHS)),
});

const sameService = (a: ServiceEntry, b: ServiceEntry) =>
  a.time === b.time && a.place === b.place && a.title === b.title;

/** The desired services of every date of `range`, by date and time, with the cancelled regular ones among them. */
export function desiredServices(content: ServicesContent, range: DateRange): DesiredService[] {
  const { regular, sheets, later, places } = content;
  const exceptions = scheduleExceptions(sheets, later, PLACE_IDS);
  const dates = eachDayOfInterval(
    { start: pragueDateTime(range.from, "12:00"), end: pragueDateTime(range.to, "12:00") },
    { in: inPrague },
  ).map((day) => pragueDate(day));
  return dates.flatMap((date) => {
    // The newer sheet wins a day two sheets share, as in `scheduleExceptions`.
    const sheetDay = sheets
      .findLast((s) => s.validFrom <= date && date <= s.validTo)
      ?.days.find((d) => d.date === date);
    const planned = servicesOnDate(date, { regular, exceptions });
    const dropped = servicesOnDate(date, { regular, exceptions: [] }).filter(
      (s) => !planned.some((p) => sameService(p, s)),
    );
    const all = [
      ...planned.map((service) => ({ service, cancelled: false })),
      ...dropped.map((service) => ({ service, cancelled: true })),
    ].sort((a, b) => clockMinutes(a.service.time) - clockMinutes(b.service.time));
    return all.map(({ service, cancelled }, index) => {
      const { time, place, title } = service;
      const changed =
        !cancelled &&
        ((!title && isChangedMass(date, time, place, regular)) ||
          !!sheetDay?.rows.some((r) => r.time === time && r.place === place && r.changed));
      const status = cancelled ? "cancelled" : changed ? "changed" : "regular";
      const startAt = pragueDateTime(date, time);
      // One hour, or the next service of the church when that comes sooner (the cancelled ones count).
      const next = all.slice(index + 1).find((o) => o.service.place === place && o.service.time !== time);
      const nextAt = next && pragueDateTime(date, next.service.time);
      const defaultEnd = addMinutes(startAt, DEFAULT_MINUTES);
      const church = places[place];
      const lines = [sheetDay?.feast, service.note, STATUS_LINES[status]].filter((line): line is string => !!line);
      return {
        googleId: serviceEventId(date, time, place, title),
        date,
        time,
        place,
        status,
        body: {
          summary: `${STATUS_PREFIXES[status]}${title ?? MASS_TITLE} ${church.locative}`,
          location: church.address,
          description: [...lines, "", `Pořad bohoslužeb: ${SERVICES_URL}`].join("\n"),
          start: pragueTime(startAt),
          end: pragueTime(nextAt && nextAt < defaultEnd ? nextAt : defaultEnd),
        },
      } satisfies DesiredService;
    });
  });
}
