import { clsx } from "clsx";
import type { IsoDate, NewsEvent } from "@/content/types";
import { eventDateBlock, fileType, formatEventWhen, formatShortDate } from "@/lib/czech";
import { eventHref, type EventStatus } from "@/lib/news";
import { externalLinkAttrs } from "@/lib/links";
import { ExternalLinkIcon, FileIcon, PinIcon } from "@/components/ui/icons";
import { POSTER_TINTS, PosterPlaceholder } from "@/components/ui/PosterPlaceholder";

type TagKind = "now" | "deadline" | "info" | "past";

const tagStyles: Record<TagKind, string> = {
  now: "bg-magenta text-white",
  deadline: "bg-orange-tint text-orange-ink-deep",
  info: "bg-blue-tint text-blue-ink",
  past: "bg-surface text-ink-2",
};

function eventTags(event: NewsEvent, status: EventStatus, today: IsoDate): { kind: TagKind; label: string }[] {
  const tags: { kind: TagKind; label: string }[] = [];
  if (status === "now") tags.push({ kind: "now", label: "Právě probíhá" });
  if (event.registrationDeadline && event.registrationDeadline >= today) {
    tags.push({ kind: "deadline", label: `Přihlášky do ${formatShortDate(event.registrationDeadline)}` });
  }
  if (event.price) tags.push({ kind: "info", label: event.price });
  // "setkání" is the same word for every count.
  if (event.sessions) tags.push({ kind: "info", label: `${event.sessions} setkání` });
  if (event.longTerm && event.longTerm !== true) tags.push({ kind: "info", label: "Každý týden" });
  if (event.label) tags.push({ kind: "info", label: event.label });
  if (status === "past") tags.push({ kind: "past", label: "Proběhlo" });
  return tags;
}

/** Anchor of an event on the Aktuality page ("Načíst další" focuses it). */
export const eventAnchor = (id: string) => `akce-${id}`;

type Props = {
  event: NewsEvent;
  status: EventStatus;
  today: IsoDate;
  /** Position in the list, picks the poster tint. */
  index: number;
  /** Beyond the current page: hidden until "Načíst další aktuality" (shown by the <noscript> style without JS). */
  more: boolean;
};

/**
 * Mobile: date block + title/meta in a row, then text, tags and actions (the content column is `contents`,
 * so its children wrap in the card's row). Tablet/desktop: date block · content column · poster.
 */
export function EventCard({ event, status, today, index, more }: Props) {
  const date = eventDateBlock(event);
  const when = formatEventWhen(event);
  const tags = eventTags(event, status, today);
  const actions = [
    ...(event.attachments ?? []).map((a) => ({ ...a, href: a.file, type: fileType(a.file) })),
    ...(event.links ?? []).map((l) => ({ ...l, type: undefined })),
  ];
  const past = status === "past";

  return (
    <article
      id={eventAnchor(event.id)}
      tabIndex={-1}
      data-more={more || undefined}
      aria-labelledby={`${eventAnchor(event.id)}-nazev`}
      className={clsx(
        "flex flex-wrap gap-x-3.5 gap-y-3 rounded-20 border border-line bg-raised p-4",
        "md:flex-nowrap md:items-start md:gap-5 md:rounded-24 md:p-5 lg:gap-7 lg:rounded-28 lg:p-6",
        past && "opacity-72",
        more && "hidden",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "flex h-17 w-15 shrink-0 flex-col items-center justify-center rounded-12 text-center leading-display",
          "md:h-20 md:w-18 md:rounded-14 lg:h-24 lg:w-22 lg:rounded-16",
          status === "now" ? "bg-magenta text-white" : "bg-magenta-tint text-magenta-ink",
        )}
      >
        <span className="text-17 font-bold md:text-19 lg:text-22">{date.top}</span>
        <span className="text-12 md:text-13 lg:text-14">{date.bottom}</span>
      </span>

      <div className="max-md:contents md:flex md:min-w-0 md:flex-1 md:flex-col md:gap-2 lg:gap-2.5">
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 max-md:order-1 max-md:basis-full">
            {tags.map((tag) => (
              <li
                key={tag.label}
                className={clsx(
                  "rounded-full px-2.5 py-0.75 text-13 font-bold lg:px-3 lg:text-14",
                  tagStyles[tag.kind],
                )}
              >
                {tag.label}
              </li>
            ))}
          </ul>
        )}

        <div className="flex min-w-0 flex-col gap-1 max-md:flex-1 md:gap-2 lg:gap-2.5">
          <h4
            id={`${eventAnchor(event.id)}-nazev`}
            className="text-17 leading-card font-bold md:text-20 lg:text-24 lg:leading-snug lg:tracking-heading"
          >
            <a href={eventHref(event)} className="text-ink no-underline hover:text-ink hover:underline">
              {event.title}
            </a>
          </h4>
          <p className="flex flex-col gap-1 text-14 text-ink-2 md:flex-row md:flex-wrap md:gap-x-4 md:text-15 lg:gap-x-5 lg:text-16">
            <span>{when.time ? `${when.date} · ${when.time}` : when.date}</span>
            {event.place && (
              <span className="flex items-center gap-1.5 text-muted">
                <PinIcon size={15} className="shrink-0" />
                {event.place}
              </span>
            )}
          </p>
        </div>

        <p className="text-15 text-ink-2 max-md:line-clamp-3 max-md:basis-full md:text-16 lg:max-w-170 lg:text-17">
          {event.text}
        </p>

        {actions.length > 0 && (
          <ul className="flex flex-wrap gap-2 max-md:order-2 max-md:basis-full md:pt-1">
            {actions.map((action) => (
              <li key={action.href}>
                <a
                  href={action.href}
                  {...externalLinkAttrs(action.href)}
                  className={clsx(
                    "flex min-h-11 items-center gap-1.5 rounded-12 bg-surface px-3.5 text-14 font-bold text-ink no-underline hover:text-ink md:text-15 lg:px-4",
                    action.type === undefined ? "hover:bg-blue-tint" : "hover:bg-magenta-tint",
                  )}
                >
                  {action.type === undefined ? (
                    <ExternalLinkIcon size={16} className="shrink-0 text-blue-ink" />
                  ) : (
                    <FileIcon size={16} className="shrink-0 text-magenta-ink" />
                  )}
                  {action.label}
                  {action.type && <span className="font-normal text-muted">{action.type}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mobile: no thumbnail, the poster is one of the attachments. */}
      <span
        aria-hidden="true"
        className={clsx(
          "relative hidden h-38 w-27 shrink-0 items-center justify-center overflow-hidden rounded-12 md:flex lg:h-46.5 lg:w-33 lg:rounded-14",
          past ? "bg-surface text-muted" : POSTER_TINTS[index % POSTER_TINTS.length],
          /* Dark: posters (often white paper) get a margin of the tint around them. */
          event.poster && "dark:p-2",
        )}
      >
        {event.poster ? (
          <img src={event.poster.src} alt="" loading="lazy" className="size-full object-contain dark:rounded-4" />
        ) : (
          <PosterPlaceholder iconSize={32} className="h-12 w-16 lg:h-14 lg:w-20" />
        )}
      </span>
    </article>
  );
}
