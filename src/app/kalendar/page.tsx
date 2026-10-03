import type { Metadata } from "next";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { SubscribePanel } from "@/components/calendar/SubscribePanel";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { calendarHrefs, loadCalendarEntries } from "@/content/calendar";
import { links } from "@/content/site";
import { BUILD_TIME } from "@/lib/build-time";
import { addToMonth, monthGridRange } from "@/lib/agenda";
import { pragueDate } from "@/lib/prague";

export const metadata: Metadata = {
  title: "Kalendář",
  description: "Bohoslužby i farní akce farnosti Kuřim na jednom místě, s možností přidat si kalendáře do telefonu.",
};

// The prerendered months: the previous one and the next six. Others come from Google Calendar in the browser.
const buildMonth = pragueDate(BUILD_TIME).slice(0, 7);
const range = {
  from: monthGridRange(addToMonth(buildMonth, -1)).from,
  to: monthGridRange(addToMonth(buildMonth, 6)).to,
};

/** Kalendář (design/DESIGN.md §16). Not a menu item, so no nav item is current. */
export default async function CalendarPage() {
  const entries = await loadCalendarEntries(range);
  return (
    <>
      <SiteHeader currentHref={links.calendar} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-6 pt-5 pb-12 md:gap-7 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading
          title="Kalendář"
          color="blue"
          size="standard"
          intro="Bohoslužby i farní akce na jednom místě. Klepněte na den a uvidíte program."
        />
        <MonthCalendar entries={entries} hrefs={calendarHrefs} renderedAt={BUILD_TIME}>
          <SubscribePanel />
        </MonthCalendar>
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
