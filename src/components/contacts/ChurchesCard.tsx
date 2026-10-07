import { clsx } from "clsx";
import { parishChurches } from "@/content/masses";
import { links } from "@/content/site";
import type { ParishChurch } from "@/content/types/contacts";
import { mapHref, NEW_TAB } from "@/lib/shared/links";
import { ArrowRightIcon } from "@/components/ui/icons/navigation-icons";
import { ContactCard } from "./ContactCard";

const bars: Record<ParishChurch["color"], string> = {
  blue: "bg-blue",
  green: "bg-green",
  orange: "bg-orange",
  magenta: "bg-magenta",
};

/** "Kostely a kaple" (§15.1): one row per village, each a link to Mapy.cz. */
export function ChurchesCard() {
  return (
    <ContactCard id="kostely-a-kaple" title="Kostely a kaple">
      <ul>
        {parishChurches.map((church) => (
          <li key={church.village} className="border-t border-line last:border-b">
            <a
              href={mapHref(church.mapQuery)}
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
          </li>
        ))}
      </ul>
      <a href={links.services} className="flex min-h-11 items-center gap-1.5 self-start font-bold">
        Pořad bohoslužeb
        <ArrowRightIcon size={18} />
      </a>
    </ContactCard>
  );
}
