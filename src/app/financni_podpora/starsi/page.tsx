import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PastProjectCard } from "@/components/support/PastProjectCard";
import { ArrowLeftIcon } from "@/components/ui/icons/navigation-icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { links } from "@/content/site";
import { pastProjects } from "@/content/support-archive";

const lead = "Vyúčtování dokončených a dřívějších oprav podle let. Děkujeme všem dárcům a poskytovatelům dotací.";

export const metadata: Metadata = {
  title: "Starší projekty",
  alternates: { canonical: links.supportArchive },
  description: `${lead} Kostel sv. Markéty v Moravských Knínicích, fara a kostel sv. Maří Magdaleny v Kuřimi.`,
};

/** Starší projekty (design/DESIGN.md §28): the yearly accounts of the finished repairs. */
export default function SupportArchivePage() {
  return (
    <>
      <SiteHeader currentHref={links.support} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
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
        <a href={links.support} className="flex min-h-11 items-center gap-2 self-start font-bold">
          <ArrowLeftIcon size={18} />
          Aktuální projekty a jak přispět
        </a>
      </main>
    </>
  );
}
