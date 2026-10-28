import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
    <>
      <SiteHeader currentHref={links.nativity} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <NativityPage
          seasons={shownNativitySeasons}
          albums={nativityAlbums}
          oldSiteResults={oldSiteContestResults}
          renderedAt={BUILD_TIME}
        />
      </main>
    </>
  );
}
