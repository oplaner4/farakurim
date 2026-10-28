import { clsx } from "clsx";
import type { NativityPlace, NativitySeason } from "@/content/types/nativity";
import { mapHref } from "@/lib/shared/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PinIcon } from "@/components/ui/icons/contact-icons";
import { FileIcon } from "@/components/ui/icons/media-icons";
import { AccessibleIcon } from "@/components/ui/icons/nativity-icons";
import { NativitySection } from "./NativitySection";

const tints: Record<NativityPlace["color"], { card: string; shard: string; ink: string; dot: string }> = {
  blue: { card: "bg-blue-tint", shard: "bg-blue", ink: "text-blue-ink", dot: "bg-blue" },
  green: { card: "bg-green-tint", shard: "bg-green", ink: "text-green-ink", dot: "bg-green" },
};

/** "Kde výstavu najdete" (design/DESIGN.md §30.2): a card per place, then the plan and the way there. */
export function Places({ season }: { season: NativitySeason }) {
  return (
    <NativitySection id="kde" title="Kde výstavu najdete" color="orange">
      <div className="grid gap-3 md:grid-cols-2">
        {season.places.map((place) => {
          const tint = tints[place.color];
          return (
            <div
              key={place.name}
              className={clsx(
                "relative flex flex-col gap-3 overflow-hidden rounded-20 p-4 md:rounded-22 md:p-5 lg:rounded-24 lg:p-6",
                tint.card,
              )}
            >
              <span aria-hidden="true" className={clsx("absolute top-0 right-0 size-12 shard-tr", tint.shard)} />
              <h3 className="pr-10 text-20 leading-heading font-bold">{place.name}</h3>
              <span className={clsx("flex items-center gap-1.5 text-15", tint.ink)}>
                <PinIcon size={16} className="flex-none" />
                {place.address}
              </span>
              <ul className="flex flex-col gap-1.5 text-16">
                {place.notes.map((note) => (
                  <li key={note} className="flex items-start gap-2.5">
                    <span aria-hidden="true" className={clsx("mt-2.25 size-2 flex-none rounded-full", tint.dot)} />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              {place.accessible && (
                <span
                  className={clsx(
                    "flex items-center gap-1.5 self-start rounded-full bg-raised px-3 py-1 text-14 font-bold",
                    tint.ink,
                  )}
                >
                  <AccessibleIcon size={16} />
                  Bezbariérový vstup
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={season.planUrl} variant="outline-orange" size="small">
          <FileIcon size={18} />
          Orientační plánek (PDF)
        </ButtonLink>
        <ButtonLink href={mapHref(season.mapQuery)} variant="outline-orange" size="small">
          <PinIcon size={18} />
          Navigovat
        </ButtonLink>
      </div>
    </NativitySection>
  );
}
