import { clsx } from "clsx";
import { parishChurches } from "@/content/masses";
import { links } from "@/content/site";
import type { ParishChurch } from "@/content/types/contacts";
import { mapHref, NEW_TAB } from "@/lib/shared/links";
import { ArrowRightIcon, ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";
import { ContactCard } from "./ContactCard";
import { ArrowLink } from "@/components/ui/ArrowLink";

const bars: Record<ParishChurch["color"], string> = {
  blue: "bg-blue",
  green: "bg-green",
  orange: "bg-orange",
  magenta: "bg-magenta",
};

const rings: Record<ParishChurch["color"], string> = {
  blue: "border-blue",
  green: "border-green",
  orange: "border-orange",
  magenta: "border-magenta",
};

/** "Kostely a kaple" (§15.1): one row per village, each a link to Mapy.cz, with its other chapels below it. */
export function ChurchesCard() {
  return (
    <ContactCard id="kostely-a-kaple" title="Kostely a kaple">
      <ul className="flex flex-col gap-3">
        {parishChurches.map((church) => (
          <li key={church.village} className="border-t border-line last:border-b">
            <a
              href={church.mapUrl ?? mapHref(church.mapQuery)}
              {...NEW_TAB}
              className="flex min-h-18 items-center gap-3.5 py-2 text-ink no-underline hover:text-ink"
            >
              <span aria-hidden="true" className={clsx("h-9 w-3 flex-none rounded-4", bars[church.color])} />
              <span className="flex flex-1 flex-col leading-card">
                <strong>{church.village}</strong>
                <span className="text-14 text-muted">
                  {church.note ? `${church.building} · ${church.note}` : church.building}
                </span>
              </span>
              <span className="flex items-center gap-1 text-14 font-bold text-blue-ink">
                Mapa
                <ArrowRightIcon size={14} />
              </span>
            </a>
            {church.chapels && (
              <ul aria-label={`Další kaple – ${church.village}`} className="mt-3 mb-1.5 flex flex-col pl-6.5">
                {church.chapels.map((chapel) => (
                  <li key={chapel.href}>
                    <a
                      href={chapel.href}
                      {...NEW_TAB}
                      className="flex min-h-10 items-center gap-2.5 text-ink no-underline hover:text-ink"
                    >
                      <span
                        aria-hidden="true"
                        className={clsx("size-3 flex-none rounded-full border-2", rings[church.color])}
                      />
                      <span className="flex-1 text-15">{chapel.name}</span>
                      <span className="flex items-center gap-1 text-13 font-bold text-blue-ink">
                        Katalog
                        <ExternalLinkIcon size={14} className="flex-none" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <ArrowLink href={links.services} className="self-start">
        Pořad bohoslužeb
      </ArrowLink>
    </ContactCard>
  );
}
