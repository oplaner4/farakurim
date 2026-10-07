import { clsx } from "clsx";
import type { ReactNode } from "react";
import { links } from "@/content/site";
import { externalLinkAttrs } from "@/lib/shared/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CalendarIcon } from "@/components/ui/icons/contact-icons";
import { ArrowRightIcon } from "@/components/ui/icons/navigation-icons";

type CardProps = { id: string; title: string; children: ReactNode; desktopOnly?: boolean };

function InfoCard({ id, title, children, desktopOnly }: CardProps) {
  return (
    <section
      aria-labelledby={id}
      className={clsx(
        "flex-col gap-2.5 rounded-24 bg-surface p-5 md:p-6 lg:rounded-28 lg:p-7",
        desktopOnly ? "hidden lg:flex" : "flex",
      )}
    >
      <h2 id={id} className="text-20 font-bold md:text-22 lg:text-24">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} {...externalLinkAttrs(href)} className="flex min-h-11 items-center gap-1.5 self-start font-bold">
      {children}
      <ArrowRightIcon size={18} />
    </a>
  );
}

/**
 * Svátost smíření, Křty and Kalendář farnosti (design/DESIGN.md §14.1). The calendar is an outline button
 * on mobile and tablet and a third card on desktop.
 */
export function InfoCards({ confession, baptism }: { confession: string; baptism: string }) {
  return (
    <div className="grid gap-7 md:grid-cols-2 md:gap-x-4 md:gap-y-9 lg:grid-cols-3 lg:gap-5">
      <InfoCard id="svatost-smireni" title="Svátost smíření">
        <p className="text-ink-2">{confession}</p>
      </InfoCard>
      <InfoCard id="krty" title="Křty">
        <p className="text-ink-2">{baptism}</p>
        <ArrowLink href={links.contacts}>Kontakty na faru</ArrowLink>
      </InfoCard>
      <InfoCard id="kalendar-farnosti" title="Kalendář farnosti" desktopOnly>
        <p className="text-ink-2">Všechny bohoslužby a akce na jednom místě.</p>
        <ArrowLink href={links.calendar}>Otevřít kalendář</ArrowLink>
      </InfoCard>
      <ButtonLink href={links.calendar} variant="outline" className="md:col-span-2 md:justify-self-start lg:hidden">
        <CalendarIcon size={18} strokeWidth={2} />
        Kalendář farnosti
      </ButtonLink>
    </div>
  );
}
