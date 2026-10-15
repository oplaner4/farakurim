import { clsx } from "clsx";
import type { NextCamp } from "@/content/types/camp";
import { links } from "@/content/site";
import { nextCampDates } from "@/lib/camp/years";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TentIcon } from "@/components/ui/icons/camp-icons";
import { MailIcon } from "@/components/ui/icons/contact-icons";
import { ArrowRightIcon } from "@/components/ui/icons/navigation-icons";

/**
 * "Tábor 2027 – připravujeme" on O táboru (design/DESIGN.md §29.2, 2): the magenta panel with the dates ("upřesníme"
 * until known) and the applications. Once the year has its page, the main button leads there instead of Kontakt.
 */
export function NextCampPanel({ camp, className }: { camp: NextCamp; className?: string }) {
  return (
    <section
      aria-labelledby="pristi-tabor"
      className={clsx(
        "relative flex flex-col gap-3.5 overflow-hidden rounded-24 bg-magenta-tint p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7",
        className,
      )}
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-18 bg-magenta shard-tr" />
      <div className="flex items-center gap-3.5 pr-14">
        <span
          aria-hidden="true"
          className="flex size-13 flex-none items-center justify-center rounded-14 bg-magenta text-white"
        >
          <TentIcon size={26} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-13 font-bold tracking-caps text-magenta-ink uppercase">Připravujeme</span>
          <h2 id="pristi-tabor" className="text-24 leading-heading font-bold md:text-26 lg:text-28">
            Tábor {camp.year}
          </h2>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {[
          ["Termín", nextCampDates(camp)],
          ["Přihlášky", camp.applications],
        ].map(([term, value]) => (
          <div key={term} className="flex flex-col gap-0.5 rounded-14 bg-raised px-3.5 py-3">
            <dt className="text-13 text-muted">{term}</dt>
            <dd className="font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        {camp.href ? (
          <ButtonLink href={camp.href} variant="magenta" size="small">
            Více o táboru {camp.year}
            <ArrowRightIcon size={18} />
          </ButtonLink>
        ) : (
          <ButtonLink href={links.campContact} variant="magenta" size="small">
            <MailIcon size={18} />
            Zeptat se vedoucích
          </ButtonLink>
        )}
        <ButtonLink href={links.campYears} variant="outline-magenta" size="small">
          Minulé ročníky
        </ButtonLink>
      </div>
    </section>
  );
}
