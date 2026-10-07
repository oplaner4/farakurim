import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CurrentIssuePanel } from "@/components/petrklic/CurrentIssuePanel";
import { EditorialPanels } from "@/components/petrklic/EditorialPanels";
import { PageViewer } from "@/components/petrklic/PageViewer";
import { PreviousIssues } from "@/components/petrklic/PreviousIssues";
import { PageHeading } from "@/components/ui/PageHeading";
import { petrklicEditorial, petrklicIssues, petrklicTexts } from "@/content/petrklic";
import { links } from "@/content/site";
import { issueLabel } from "@/lib/petrklic/issues";

const [current, ...previous] = petrklicIssues;

export const metadata: Metadata = {
  title: `Petrklíč ${issueLabel(current)}`,
  alternates: { canonical: links.petrklic },
  description: `${petrklicTexts.lead} Aktuální číslo ${issueLabel(current)} ke čtení online a ke stažení.`,
};

/** Petrklíč – aktuální číslo (design/DESIGN.md §17). */
export default function PetrklicPage() {
  const { pageImages } = current;
  return (
    <>
      <SiteHeader currentHref={links.petrklic} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-7 pt-5 pb-12 md:gap-9 md:pt-7 md:pb-14 lg:gap-12 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Petrklíč" color="orange" size="standard" intro={petrklicTexts.lead} />
        <CurrentIssuePanel issue={current} intro={petrklicTexts.current} />
        {pageImages && <PageViewer issue={{ ...current, pageImages }} />}
        <PreviousIssues issues={previous.slice(0, 4)} />
        <EditorialPanels {...petrklicEditorial} />
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
