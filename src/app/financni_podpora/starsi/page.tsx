import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PastProjectCard } from "@/components/support/PastProjectCard";
import { ArrowLeftIcon } from "@/components/ui/icons/navigation-icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { links } from "@/content/site";
import { pastProjects } from "@/content/support-archive";
import { ArrowLink } from "@/components/ui/ArrowLink";

const lead = "Vyúčtování dokončených a dřívějších oprav podle let. Děkujeme všem dárcům a poskytovatelům dotací.";

export const metadata: Metadata = {
  title: "Starší projekty",
  alternates: { canonical: links.supportArchive },
  description: `${lead} Kostel sv. Markéty v Moravských Knínicích, fara a kostel sv. Maří Magdaleny v Kuřimi.`,
};

/** Starší projekty (design/DESIGN.md §28): the yearly accounts of the finished repairs. */
export default function SupportArchivePage() {
  return (
    <PageShell currentHref={links.support}>
      <PageHeading
        title="Starší projekty"
        color="orange"
        size="standard"
        parents={[{ label: "Finanční podpora", href: links.support }]}
        intro={lead}
      />
      {pastProjects.map((project, i) => (
        <PastProjectCard key={project.id} project={project} open={i === 0} />
      ))}
      <ArrowLink href={links.support} icon={ArrowLeftIcon} iconAt="start" gap="wide" className="self-start">
        Aktuální projekty a jak přispět
      </ArrowLink>
    </PageShell>
  );
}
