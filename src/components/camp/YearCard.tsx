import { clsx } from "clsx";
import type { CampYear } from "@/content/types/camp";
import { campDates, yearAnchor, yearTint, type YearTint } from "@/lib/camp/years";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { TentIcon } from "@/components/ui/icons/camp-icons";
import { PinIcon } from "@/components/ui/icons/contact-icons";
import { ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";

const tints: Record<YearTint, { area: string; ink: string }> = {
  magenta: { area: "bg-magenta-tint-alt", ink: "text-magenta-ink" },
  blue: { area: "bg-blue-tint-alt", ink: "text-blue-ink" },
  green: { area: "bg-green-tint", ink: "text-green-ink" },
  orange: { area: "bg-orange-tint-alt", ink: "text-orange-ink-deep" },
};

/**
 * One year on Ročníky (design/DESIGN.md §29.5): a photo from the year's album on its tint with the big year on a
 * chip, the camp game's theme (the year is in the heading for screen readers), the dates, the place and "Fotky
 * z tábora" on Zonerama. A year without an album yet shows a tent on its tint. The card's id is the anchor the old
 * year URL opens.
 */
export function YearCard({ camp }: { camp: CampYear }) {
  const tint = tints[yearTint(camp.year)];
  return (
    <li
      id={yearAnchor(camp.year)}
      className="flex scroll-mt-4 flex-col overflow-hidden rounded-18 bg-surface md:rounded-20 lg:rounded-22"
    >
      <div
        className={clsx("relative flex h-47.5 items-center justify-center md:h-42.5 lg:h-47.5", tint.area, tint.ink)}
      >
        {camp.cover ? (
          <img src={camp.cover} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <TentIcon size={44} strokeWidth={1.5} />
        )}
        <span
          className={clsx(
            "absolute bottom-3 left-3.5 rounded-12 bg-raised px-3 py-1 text-26 leading-heading font-bold",
            tint.ink,
          )}
        >
          {camp.year}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4.5 pt-4 pb-4.5">
        <h2 className="text-19 leading-card font-bold">
          {camp.theme ? (
            <>
              <span className="sr-only">Tábor {camp.year}: </span>
              {camp.theme}
            </>
          ) : (
            `Tábor ${camp.year}`
          )}
        </h2>
        <p className="flex flex-col gap-0.5 text-15 text-ink-2">
          <span>{campDates(camp.start, camp.end)}</span>
          <span className="flex items-center gap-1.5 text-muted">
            <PinIcon size={16} className="flex-none" />
            {camp.place}
          </span>
        </p>
        {camp.album && (
          <ArrowLink href={camp.album} icon={ExternalLinkIcon} className="mt-auto self-start">
            Fotky z tábora
          </ArrowLink>
        )}
      </div>
    </li>
  );
}
