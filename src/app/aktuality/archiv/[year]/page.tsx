import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARCHIVE_YEARS, ArchivePage } from "@/components/news/ArchivePage";
import { events } from "@/content/news";
import { archiveYearHref, archiveYears } from "@/lib/news/archive";

// Static export: every year button has a page (the newest year's is also the default page's list, but a search
// there stays in that year).
export const dynamicParams = false;

const years = archiveYears(ARCHIVE_YEARS);

export function generateStaticParams() {
  return years.map((y) => ({ year: y.slug }));
}

export async function generateMetadata({ params }: PageProps<"/aktuality/archiv/[year]">): Promise<Metadata> {
  const { year: slug } = await params;
  const year = years.find((y) => y.slug === slug);
  if (!year) return { title: "Archiv aktualit" };
  // The year's latest events name the page in search results; the year pages are otherwise alike.
  const latest = [
    ...new Set(
      events
        .filter(year.matches)
        .toSorted((a, b) => b.start.localeCompare(a.start))
        .map((e) => e.title),
    ),
  ];
  return {
    title: `Archiv aktualit: ${year.label}`,
    description: `Proběhlé akce farnosti Kuřim v roce ${year.label} s pozvánkami a plakáty: ${latest.slice(0, 3).join(", ")} a další.`,
    alternates: { canonical: archiveYearHref(slug) },
  };
}

export default async function NewsArchiveYearPage({ params }: PageProps<"/aktuality/archiv/[year]">) {
  const { year: slug } = await params;
  if (!years.some((y) => y.slug === slug)) notFound();
  return <ArchivePage yearSlug={slug} />;
}
