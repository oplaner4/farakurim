"use client";

import { links, parishCalendars } from "@/content/site";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FilterPill } from "@/components/ui/FilterPill";
import { useCalendarApp } from "@/hooks/use-calendar-app";
import {
  CALENDAR_APP_HINTS,
  CALENDAR_APP_LABELS,
  CALENDAR_APPS,
  calendarFeedUrl,
  subscribeHref,
} from "@/lib/calendar/subscribe";
import { CalendarFeedField } from "./CalendarFeedField";
import { SubscribeFallback } from "./SubscribeFallback";

const buttonClass = "min-h-12 grow basis-45 px-3.5";
const { services, events } = parishCalendars;

/**
 * "Kalendář v telefonu" (design/DESIGN.md §16.2, 5 and §16.6): pick the calendar app, then subscribe to the parish's
 * calendars in it, or copy their feeds for another app. Without JS, "Všechny možnosti" lists every link.
 */
export function SubscribePanel() {
  const [app, chooseApp] = useCalendarApp();

  return (
    <section
      aria-labelledby="kalendar-v-telefonu"
      className="relative flex flex-col gap-3 overflow-hidden rounded-24 bg-blue-tint p-4.5 md:p-5.5 lg:p-6"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-blue shard-tr" />
      <h2 id="kalendar-v-telefonu" className="pr-12 text-18 font-bold md:text-20 lg:text-22">
        Kalendář v telefonu
      </h2>
      <p className="text-ink-2">Přidejte si naše kalendáře do telefonu nebo počítače. Aktualizují se samy.</p>

      <div role="group" aria-labelledby="kalendar-aplikace" data-js-only className="flex flex-col gap-2">
        <span id="kalendar-aplikace" className="text-14 font-bold">
          Kde máte kalendář?
        </span>
        {/* Mobile: one row scrolling to the panel's edges; wider screens wrap. */}
        <ul className="-mx-4.5 flex gap-2 overflow-x-auto px-4.5 py-0.5 md:mx-0 md:flex-wrap md:p-0">
          {CALENDAR_APPS.map((option) => (
            <li key={option} className="shrink-0">
              <FilterPill
                tone="primary"
                ground="tint"
                size="count"
                aria-pressed={option === app}
                onClick={() => chooseApp(option)}
                className="whitespace-nowrap"
              >
                {CALENDAR_APP_LABELS[option]}
              </FilterPill>
            </li>
          ))}
        </ul>
      </div>

      {app === "other" ? (
        <div data-js-only className="flex flex-col gap-2">
          <CalendarFeedField id="kanal-bohosluzby" name={services.name} feed={calendarFeedUrl(services)} dot="blue" />
          <CalendarFeedField id="kanal-udalosti" name={events.name} feed={calendarFeedUrl(events)} dot="magenta" />
          <p className="text-14 text-ink-2">
            V aplikaci zvolte <strong>Přidat kalendář z adresy URL</strong> (nebo „Odebírat kalendář“) a vložte odkaz.
          </p>
        </div>
      ) : (
        <>
          <div data-js-only className="flex flex-wrap gap-2">
            <ButtonLink href={subscribeHref(app, services)} size="block" className={buttonClass}>
              + {services.name}
            </ButtonLink>
            <ButtonLink href={subscribeHref(app, events)} variant="magenta" size="block" className={buttonClass}>
              + {events.name}
            </ButtonLink>
          </div>
          <p data-js-only className="text-14 text-muted">
            {CALENDAR_APP_HINTS[app]}
          </p>
        </>
      )}

      <SubscribeFallback />
      <p className="text-14 text-muted">Změny se v aplikaci mohou projevit až za několik hodin.</p>
      <ArrowLink href={links.services} className="self-start">
        Pravidelný pořad bohoslužeb
      </ArrowLink>
    </section>
  );
}
