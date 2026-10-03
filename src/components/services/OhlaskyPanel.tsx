import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { Announcement, AnnouncementCategory, ServiceSheet } from "@/content/types";
import { formatDateRange } from "@/lib/czech";
import { sortAnnouncements } from "@/lib/service-sheet";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  ArrowRightIcon,
  ChurchIcon,
  ClockIcon,
  FileDownloadIcon,
  HeartIcon,
  InfoIcon,
  WarningIcon,
} from "@/components/ui/icons";

const categories: Record<AnnouncementCategory, { label: string; icon: ReactNode; className: string }> = {
  zmena: {
    label: "Změna bohoslužeb",
    icon: <WarningIcon size={14} strokeWidth={2.2} />,
    className: "bg-orange-tint text-orange-ink-deep",
  },
  smireni: {
    label: "Svátost smíření",
    icon: <ClockIcon size={14} strokeWidth={2.2} />,
    className: "bg-blue-tint text-blue-ink",
  },
  pozvanka: {
    label: "Pozvánka",
    icon: <ChurchIcon size={14} strokeWidth={2.2} />,
    className: "bg-magenta-tint text-magenta-ink",
  },
  podekovani: {
    label: "Poděkování",
    icon: <HeartIcon size={14} strokeWidth={2.2} />,
    className: "bg-green-tint text-green-ink",
  },
  info: { label: "Oznámení", icon: <InfoIcon size={14} strokeWidth={2.2} />, className: "bg-surface text-ink-2" },
};

type Props = {
  sheet: ServiceSheet;
  /** Detail page of each announcement's related Aktuality record ("Více v aktualitách"). */
  newsHref: (newsId: string) => string | undefined;
};

/*
 * Ohlášky "Tento týden" (design/DESIGN.md §14.1, §14.5): the title with the PDF button, then one card per
 * announcement, changes first. One column on mobile, two from tablet up.
 */
export function OhlaskyPanel({ sheet, newsHref }: Props) {
  return (
    <section
      aria-labelledby="tento-tyden"
      className="relative flex flex-col gap-4 overflow-hidden rounded-24 bg-blue-tint px-4.5 py-5.5 md:gap-5 md:rounded-28 md:p-7 lg:gap-6 lg:rounded-32 lg:p-9"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-18 bg-blue shard-tr md:size-22 lg:size-32.5" />
      <span
        aria-hidden="true"
        className="absolute top-0 right-10 h-10 w-8 bg-green shard-tr md:right-12.5 md:h-12 md:w-9.5 lg:right-19 lg:h-17.5 lg:w-13.5"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 pr-10 md:pr-20 lg:pr-37.5">
        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-bold tracking-eyebrow text-blue-ink uppercase">Tento týden</span>
          <h2 id="tento-tyden" className="text-22 leading-heading font-bold tracking-heading md:text-28 lg:text-36">
            Ohlášky {formatDateRange(sheet.validFrom, sheet.validTo)}
          </h2>
        </div>
        <ButtonLink href={sheet.pdfUrl} className="max-md:basis-full">
          <FileDownloadIcon />
          Ohlášky v PDF
        </ButtonLink>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {sortAnnouncements(sheet.announcements).map((item) => (
          <AnnouncementCard key={item.html} item={item} href={item.newsId && newsHref(item.newsId)} />
        ))}
      </ul>
    </section>
  );
}

function AnnouncementCard({ item, href }: { item: Announcement; href?: string }) {
  const category = categories[item.category];
  return (
    <li
      className={clsx(
        "flex flex-col gap-2.5 rounded-18 bg-raised p-4.5",
        item.category === "zmena" && "border-2 border-orange",
      )}
    >
      <span
        className={clsx(
          "flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.75 text-13 font-bold",
          category.className,
        )}
      >
        {category.icon}
        {category.label}
      </span>
      {/* The editor's HTML (bold, links); the API must sanitise it. */}
      <div className="rich-text [&_a]:font-bold" dangerouslySetInnerHTML={{ __html: item.html }} />
      {href && (
        <a
          href={href}
          className="mt-auto flex min-h-11 items-center gap-1.5 self-start font-bold text-magenta-ink hover:text-ink"
        >
          Více v aktualitách
          <ArrowRightIcon size={18} />
        </a>
      )}
    </li>
  );
}
