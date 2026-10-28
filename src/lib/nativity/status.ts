import { differenceInCalendarDays } from "date-fns";
import type { NativityOpeningDay, NativitySeason } from "@/content/types/nativity";
import { atClockTime, capitalize, formatDayMonth, onWeekday, plural, weekdayName } from "@/lib/shared/czech";
import { pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { exhibitionState, firstOpeningDay, lastOpeningDay, openingStatus, type ExhibitionState } from "./season";

// The status panel of Betlémy (design/DESIGN.md §30.2): its pill, heading and line for the visitor's time.

export type StatusPanel = {
  /** Which buttons the panel shows: before, during or after the exhibition. */
  state: ExhibitionState;
  /** `open`: the green "Právě otevřeno" (a live status); otherwise the white pill with the star. */
  pill: { text: string; open: boolean };
  /** The heading's lines. */
  title: string[];
  text: string;
};

const PLACES = "Kostel sv. Maří Magdalény a fara v Kuřimi.";
const days = (n: number) => `${n} ${plural(n, ["den", "dny", "dní"])}`;
/** "v pátek 1. ledna" */
const onDay = (date: string) => `${onWeekday(date)} ${formatDayMonth(date)}`;
const hours = (day: NativityOpeningDay) => `${day.from}–${day.to}`;

function after(season: NativitySeason): StatusPanel {
  return {
    state: "after",
    pill: { text: `Výstava ${season.year} skončila`, open: false },
    title: ["Děkujeme za návštěvu!"],
    text: `Děkujeme všem dětem, vystavovatelům a dobrovolníkům. Další výstava bude v prosinci ${season.year + 1}.`,
  };
}

export function statusPanel(season: NativitySeason, now: number): StatusPanel {
  const today = pragueDate(now);
  const state = exhibitionState(season, today);
  const first = season.openingDays[0];
  const last = lastOpeningDay(season);

  if (state === "before") {
    const left = differenceInCalendarDays(
      pragueDateTime(firstOpeningDay(season), "12:00"),
      pragueDateTime(today, "12:00"),
    );
    return {
      state,
      pill: { text: left === 1 ? "Výstava začne zítra" : `Výstava začne za ${days(left)}`, open: false },
      title: [`Zahájení ${onWeekday(first.date)}`, `${formatDayMonth(first.date)} ${atClockTime(first.from)}`],
      text: `${PLACES} Otevřeno ${days(season.openingDays.length)}, poslední den ${onDay(last)}.`,
    };
  }
  if (state === "after") return after(season);

  const status = openingStatus(season, now);
  if (status.today) {
    return {
      state,
      pill: status.open
        ? { text: "Právě otevřeno", open: true }
        : { text: `Dnes otevíráme ${atClockTime(status.today.from)}`, open: false },
      title: ["Dnes otevřeno", hours(status.today)],
      text: `${capitalize(weekdayName(today))} ${formatDayMonth(today)} · kostel a fara. ${
        status.next ? `Příště ${onDay(status.next.date)} ${hours(status.next)}.` : "Dnes je poslední den výstavy."
      }`,
    };
  }
  // The last day's hours are over: the exhibition has ended.
  if (!status.next) return after(season);
  return {
    state,
    pill: { text: "Dnes zavřeno", open: false },
    title: ["Příště otevřeno", `${onDay(status.next.date)} ${hours(status.next)}`],
    text: `${PLACES} Poslední den ${onDay(last)}.`,
  };
}
