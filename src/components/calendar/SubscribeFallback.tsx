import { ChevronDownIcon } from "@/components/ui/icons/navigation-icons";
import { parishCalendars } from "@/content/site";
import {
  CALENDAR_APP_LABELS,
  CALENDAR_APPS,
  calendarFeedUrl,
  subscribeHref,
  type LinkedCalendarApp,
} from "@/lib/calendar/subscribe";
import { externalLinkAttrs } from "@/lib/shared/links";

const calendars = [parishCalendars.services, parishCalendars.events];
const linkedApps = CALENDAR_APPS.filter((app): app is LinkedCalendarApp => app !== "other");

/**
 * "Všechny možnosti" (design/DESIGN.md §16.6, 6): every subscribe link of both calendars, for visitors without JS.
 * Hidden until the page's <noscript> style shows it.
 */
export function SubscribeFallback() {
  return (
    <details data-subscribe-fallback className="group hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-blue-ink">
        Všechny možnosti
        <ChevronDownIcon className="flex-none group-open:rotate-180" />
      </summary>
      <ul className="flex flex-col gap-2 pt-1">
        {linkedApps.map((app) => (
          <li key={app}>
            <span className="font-bold">{CALENDAR_APP_LABELS[app]}:</span>{" "}
            {calendars.map((calendar, index) => {
              const href = subscribeHref(app, calendar);
              return (
                <span key={calendar.googleId}>
                  {index > 0 && " · "}
                  <a href={href} {...externalLinkAttrs(href)}>
                    + {calendar.name}
                  </a>
                </span>
              );
            })}
          </li>
        ))}
        <li>
          <span className="font-bold">{CALENDAR_APP_LABELS.other}</span> (vložte odkaz jako kalendář z adresy URL):
          {calendars.map((calendar) => {
            const feed = calendarFeedUrl(calendar);
            return (
              <span key={calendar.googleId} className="block text-14 break-all">
                {calendar.name}:{" "}
                <a href={feed} {...externalLinkAttrs(feed)}>
                  {feed}
                </a>
              </span>
            );
          })}
        </li>
      </ul>
      <noscript>
        <style>{"[data-subscribe-fallback]{display:block}"}</style>
      </noscript>
    </details>
  );
}
