import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { NativityPage } from "@/components/nativity/NativityPage";
import { nativityAlbums, oldSiteContestResults } from "@/content/nativity";
import { links } from "@/content/site";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { shownNativitySeasons } from "@/server/nativity";

export const metadata: Metadata = {
  title: "Betlémy v Kuřimi",
  alternates: { canonical: links.nativity },
  description:
    "Výstava betlémů v kostele sv. Maří Magdalény a na faře v Kuřimi: otevírací doba, soutěž školních tříd o nej betlém, společný kuřimský betlém a betlémské putování městem.",
};

/** Betlémy (design/DESIGN.md §30): before, during and after the exhibition, chosen by the visitor's date. */
export default function NativityRoute() {
  return (
    <PageShell currentHref={links.nativity}>
      <NativityPage
        seasons={shownNativitySeasons}
        albums={nativityAlbums}
        oldSiteResults={oldSiteContestResults}
        renderedAt={BUILD_TIME}
      />
    </PageShell>
  );
}
