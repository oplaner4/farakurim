import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { OtherSupport } from "@/components/support/OtherSupport";
import { ProjectCard } from "@/components/support/ProjectCard";
import { WaysToGive } from "@/components/support/WaysToGive";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { links } from "@/content/site";
import { support } from "@/content/support";
import { formatNumericDate } from "@/lib/shared/czech";
import { ArrowLink } from "@/components/ui/ArrowLink";

const lead = "Vaše dary zajišťují chod farnosti, její život a opravy kostelů a fary. Za každý příspěvek děkujeme.";

export const metadata: Metadata = {
  title: "Finanční podpora",
  alternates: { canonical: links.support },
  description: `${lead} Bankovní účet farnosti, projekty roku ${support.year} a další možnosti podpory.`,
};

/** Finanční podpora (design/DESIGN.md §22): how to give, the projects of the year and the other funds. */
export default function SupportPage() {
  return (
    <PageShell currentHref={links.support}>
      <PageHeading title="Finanční podpora" color="orange" size="standard" intro={lead} />
      <WaysToGive />
      <section aria-labelledby="projekty" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <SectionHeading id="projekty" title={`Projekty ${support.year}`} color="orange" small />
          <span className="text-14 text-muted">Stav k {formatNumericDate(support.asOf)}</span>
        </div>
        <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
          {support.projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
      <OtherSupport support={support} />
      <ArrowLink href={links.supportArchive} gap="wide" className="self-start">
        Starší projekty a jejich vyúčtování
      </ArrowLink>
    </PageShell>
  );
}
