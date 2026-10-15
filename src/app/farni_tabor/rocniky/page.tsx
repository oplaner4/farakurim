import type { Metadata } from "next";
import { CampPageHeading } from "@/components/camp/CampPageHeading";
import { YearCard } from "@/components/camp/YearCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";
import { campYears } from "@/content/camp";
import { links } from "@/content/site";

const first = campYears[campYears.length - 1].year;
const lead = `Tábory od roku ${first}. Fotky z každého ročníku najdete v našich albech.`;

export const metadata: Metadata = {
  title: "Ročníky tábora",
  alternates: { canonical: links.campYears },
  description: `${lead} Termíny, místa a témata farních táborů.`,
};

/** Tábor – Ročníky (design/DESIGN.md §29.5): a card per year, newest first; past years have no pages of their own. */
export default function CampYearsPage() {
  return (
    <>
      <SiteHeader currentHref={links.campYears} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <CampPageHeading page="Ročníky" intro={lead} />
        <div className="flex flex-col gap-4">
          <ul aria-label="Ročníky tábora" className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
            {campYears.map((camp) => (
              <YearCard key={camp.year} camp={camp} />
            ))}
          </ul>
          <p className="flex items-center gap-2 text-14 text-muted">
            <ExternalLinkIcon size={16} className="flex-none" />
            Alba jsou na Zoneramě a otevírají se v novém okně.
          </p>
        </div>
      </main>
    </>
  );
}
