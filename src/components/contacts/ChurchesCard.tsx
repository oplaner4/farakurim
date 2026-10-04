import { clsx } from "clsx";
import { places } from "@/content/masses";
import { links } from "@/content/site";
import type { ChurchColor } from "@/content/types";
import { mapHref, NEW_TAB } from "@/lib/links";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ContactCard } from "./ContactCard";

const bars: Record<ChurchColor, string> = { blue: "bg-blue", green: "bg-green", orange: "bg-orange" };

/** "Naše kostely" (§15.1): each row links to Mapy.cz. */
export function ChurchesCard() {
  return (
    <ContactCard id="nase-kostely" title="Naše kostely">
      <ul>
        {Object.values(places).map((place) => (
          <li key={place.name} className="border-t border-line last:border-b">
            <a
              href={mapHref(place.mapQuery)}
              {...NEW_TAB}
              className="flex min-h-18 items-center gap-3.5 py-2 text-ink no-underline hover:text-ink"
            >
              <span aria-hidden="true" className={clsx("h-9 w-3 flex-none rounded-4", bars[place.color])} />
              <span className="flex flex-1 flex-col leading-card">
                <strong>{place.name}</strong>
                <span className="text-14 text-muted">{place.church ?? "bohoslužby dle domluvy"}</span>
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
