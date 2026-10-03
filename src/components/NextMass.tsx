"use client";

import { format } from "date-fns";
import { places, regularMasses, scheduleExceptions, serviceSheet } from "@/content/masses";
import { links } from "@/content/site";
import { formatDateRange, formatWeekdayDate } from "@/lib/czech";
import { countdown, formatMassDay, upcomingMasses } from "@/lib/masses";
import { inPrague, pragueDateTime } from "@/lib/prague";
import { useHydrated, useNow } from "@/lib/use-now";
import { ButtonLink } from "./ButtonLink";
import { ArrowRightIcon, FileDownloadIcon, PinIcon } from "./icons";

const source = { regular: regularMasses, exceptions: scheduleExceptions };

/** Value for `<time dateTime>`: "2026-10-04T08:00" */
const isoDateTime = (date: string, time: string) =>
  format(pragueDateTime(date, time), "yyyy-MM-dd'T'HH:mm", { in: inPrague });

type Props = {
  renderedAt: number;
  showCountdown?: boolean;
};

/*
 * One markup, three layouts:
 * - mobile and desktop: the two column wrappers are `display: contents` and `order-*` interleaves
 *   their children into one column;
 * - tablet: the wrappers become two grid columns.
 */
export function NextMass({ renderedAt, showCountdown = true }: Props) {
  const now = useNow(renderedAt);
  const hydrated = useHydrated();
  const [next, ...following] = upcomingMasses(now, source, 3);
  const left = next ? countdown(next.startsAt, now) : null;

  return (
    <section
      aria-labelledby="nejblizsi-mse"
      className="relative mx-4 -mt-11 flex flex-col gap-4.5 overflow-hidden rounded-24 bg-white px-5 py-6 shadow-card md:mx-8 md:-mt-18 md:grid md:grid-cols-2 md:gap-8 md:rounded-28 md:p-8 md:shadow-card-md lg:m-0 lg:flex lg:min-w-0 lg:grow lg:basis-95 lg:gap-5 lg:rounded-32 lg:px-8 lg:py-9 lg:shadow-card-lg"
    >
      <span
        className="pointer-events-none absolute top-0 right-0 size-18 bg-blue shard-tr md:size-24 lg:size-26"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute top-0 right-10 h-10 w-8 bg-green shard-tr md:right-14 md:h-13 md:w-10 lg:right-15 lg:h-14 lg:w-11 lg:bg-magenta"
        aria-hidden="true"
      />

      <div className="contents md:flex md:flex-col md:gap-4 lg:contents">
        <h2 id="nejblizsi-mse" className="order-1 text-14 font-bold tracking-eyebrow text-blue-ink uppercase">
          Nejbližší mše svatá
        </h2>

        {next ? (
          <div className="order-2 flex flex-col gap-0.5">
            <p className="text-18 font-bold md:text-20">{formatMassDay(next.date, now)}</p>
            <p className="text-64 leading-none font-bold tracking-time text-blue md:text-76 lg:text-84">
              <time dateTime={isoDateTime(next.date, next.time)}>{next.time}</time>
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-ink-2 md:mt-2.5">
              <PinIcon size={18} className="mt-0.75 flex-none md:mt-1" />
              <span>
                {places[next.place].name}, {places[next.place].church}
                {next.note && <span className="text-muted"> · {next.note}</span>}
              </span>
            </p>
          </div>
        ) : (
          <p className="order-2 text-ink-2">Aktuální bohoslužby najdete v pořadu bohoslužeb.</p>
        )}

        {/* On desktop the PDF button lives in the header. */}
        <ButtonLink href={serviceSheet.pdfUrl} className="order-5 lg:hidden">
          <FileDownloadIcon />
          Pořad bohoslužeb (PDF)
        </ButtonLink>
        <p className="order-6 -mt-2 text-center text-13 text-muted lg:hidden">
          Ohlášky na týden {formatDateRange(serviceSheet.validFrom, serviceSheet.validTo)}
        </p>
      </div>

      <div className="contents md:flex md:flex-col md:gap-5 md:pt-11 lg:contents">
        {showCountdown && left && (
          // The prerendered countdown would be stale: keep its space, show it once hydrated.
          <div
            role="group"
            aria-label="Odpočet do začátku mše"
            aria-hidden={!hydrated}
            data-ready={hydrated}
            className="order-3 grid grid-cols-3 gap-2 transition-opacity duration-300 data-[ready=false]:invisible data-[ready=false]:opacity-0 md:gap-2.5"
          >
            {[
              [left.days, left.daysLabel],
              [left.hours, left.hoursLabel],
              [left.minutes, left.minutesLabel],
            ].map(([value, label]) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-14 bg-blue-tint px-1 py-2.5 md:rounded-16 md:py-3.5 lg:py-3"
              >
                <span className="text-28 leading-display font-bold text-blue-ink tabular-nums md:text-34 lg:text-30">
                  {value}
                </span>
                <span className="text-13 text-ink-2 md:text-14">{label}</span>
              </div>
            ))}
          </div>
        )}

        {following.length > 0 && (
          <div className="order-4 flex flex-col">
            <h3 className="pb-1 text-13 font-bold text-muted">Následující bohoslužby</h3>
            <ul>
              {following.map((m) => (
                <li key={m.startsAt + m.place} className="flex items-center gap-3 border-t border-line py-2.5 lg:py-2">
                  <span className="min-w-17 text-14 text-muted md:min-w-18 md:text-15">
                    {formatWeekdayDate(m.date)}
                  </span>
                  <time className="min-w-12 font-bold" dateTime={isoDateTime(m.date, m.time)}>
                    {m.time}
                  </time>
                  <span className="text-14 text-ink-2 md:text-15">{places[m.place].name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href={links.services}
          className="order-7 mt-auto hidden items-center gap-1.5 text-15 font-bold lg:inline-flex"
        >
          Pravidelné bohoslužby a ohlášky
          <ArrowRightIcon size={18} />
        </a>
      </div>
    </section>
  );
}
