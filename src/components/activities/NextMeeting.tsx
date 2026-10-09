"use client";

import type { CalendarEntry } from "@/content/types/calendar";
import { links } from "@/content/site";
import { meetingLabel, meetingRange, meetingTile, nextMeeting, shortPlace } from "@/lib/activities/meetings";
import type { DateRange } from "@/lib/calendar/agenda";
import { NO_LINKS } from "@/lib/calendar/google-calendar";
import { useCalendarEntries } from "@/hooks/use-calendar-entries";
import { useToday } from "@/hooks/use-now";
import { ArrowLink } from "@/components/ui/ArrowLink";

type Props = {
  /** The group's meetings in `range`, prerendered; the browser re-reads Google Calendar when it has a key. */
  entries: CalendarEntry[];
  range: DateRange;
  /** What the meetings' titles contain (`GroupPage.nextMeeting`). */
  calendarTitle: string;
  renderedAt: number;
};

/**
 * "Příští setkání" of a group page (design/DESIGN.md §27.1): the date tile, day and time and place of the group's
 * next meeting in the parish calendars, and a link to the calendar. Hidden when no meeting is ahead.
 */
export function NextMeeting({ entries, range, calendarTitle, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const { entries: loaded } = useCalendarEntries({ entries, range }, meetingRange(today), NO_LINKS);
  const meeting = nextMeeting(loaded, calendarTitle, today);
  if (!meeting) return null;
  const tile = meetingTile(meeting.date);
  return (
    <section
      aria-labelledby="pristi-setkani"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-24 bg-blue-tint p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-16 flex-none flex-col items-center justify-center rounded-16 bg-blue leading-display text-white"
        >
          <span className="text-12 font-bold">{tile.weekday}</span>
          <strong className="text-22">{tile.day}</strong>
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="pristi-setkani" className="text-13 font-bold tracking-caps text-blue-ink uppercase">
            Příští setkání
          </h2>
          <strong className="text-20">{meetingLabel(meeting)}</strong>
          {meeting.place && <span className="text-15 text-ink-2">{shortPlace(meeting.place)}</span>}
        </div>
      </div>
      <ArrowLink href={links.calendar}>Všechna setkání v kalendáři</ArrowLink>
    </section>
  );
}
