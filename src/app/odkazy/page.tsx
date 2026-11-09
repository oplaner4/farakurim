import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { LinkGroupSection } from "@/components/links/LinkGroupSection";
import { ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { links } from "@/content/site";
import { linkGroups } from "@/content/web-links";

const lead = "Užitečné stránky církve, katolických médií a obcí naší farnosti.";

export const metadata: Metadata = {
  title: "Odkazy",
  alternates: { canonical: links.webLinks },
  description: `${lead} Biskupství brněnské, Radio Proglas, breviář, Bible a obce Kuřim, Moravské Knínice, Jinačovice a Česká.`,
};

/** Odkazy (design/DESIGN.md §23): recommended sites in four groups. */
export default function WebLinksPage() {
  return (
    <PageShell currentHref={links.webLinks}>
      <PageHeading title="Odkazy" color="blue" size="standard" intro={lead} />
      <p className="-mt-1 flex items-center gap-2 text-14 text-muted">
        <ExternalLinkIcon size={16} className="flex-none" />
        Odkazy vedou na jiné weby a otevírají se v novém okně.
      </p>
      {linkGroups.map((group) => (
        <LinkGroupSection key={group.id} group={group} />
      ))}
    </PageShell>
  );
}
