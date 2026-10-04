import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { petrklicIssues } from "@/content/petrklic";
import { links } from "@/content/site";
import { groupByYear } from "@/lib/petrklic/issues";
import { ArchiveYearBlock } from "./ArchiveYearBlock";
import { ArchiveYearLinks } from "./ArchiveYearLinks";
import { ArchiveYears } from "./ArchiveYears";

export const PETRKLIC_YEARS = groupByYear(petrklicIssues);
const currentId = petrklicIssues[0].id;

/**
 * Archiv Petrklíče (design/DESIGN.md §18): all years ("Vše", `year` omitted) or one year. Each is a static page;
 * the shared part of both routes.
 */
export function ArchivePage({ year }: { year?: number }) {
  const shown = year ? PETRKLIC_YEARS.filter((y) => y.year === year) : PETRKLIC_YEARS;
  const blocks = shown.map((y) => <ArchiveYearBlock key={y.year} year={y} currentId={currentId} />);
  return (
    <>
      <SiteHeader currentHref={links.petrklic} pageHref={links.petrklicArchive} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-7 pt-5 pb-12 md:gap-9 md:pt-7 md:pb-14 lg:gap-12 lg:pt-9 lg:pb-20"
      >
        <PageHeading
          title="Archiv Petrklíče"
          color="orange"
          size="standard"
          parents={[{ label: "Petrklíč", href: links.petrklic }]}
          intro="Všechna čísla zpravodaje ke stažení ve formátu PDF."
        />
        <ArchiveYearLinks years={PETRKLIC_YEARS.map((y) => y.year)} active={year} />
        <div className="flex flex-col gap-6 lg:gap-8">
          {year ? blocks : <ArchiveYears headingIds={shown.map((y) => `rok-${y.year}`)}>{blocks}</ArchiveYears>}
        </div>
        <a href={links.petrklic} className="flex min-h-11 items-center gap-1.5 self-start font-bold">
          <ChevronLeftIcon size={18} />
          Aktuální číslo
        </a>
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
