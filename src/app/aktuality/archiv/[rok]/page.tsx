import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARCHIVE_YEARS, ArchivePage } from "@/components/news/ArchivePage";
import { events } from "@/content/news";
import { archiveYearHref, archiveYears } from "@/lib/news/archive";

// Static export: every year button other than the default (the newest year) has a page.
export const dynamicParams = false;

const years = archiveYears(ARCHIVE_YEARS).filter((y) => y.slug !== "");

export function generateStaticParams() {
  return years.map((y) => ({ rok: y.slug }));
}

export async function generateMetadata({ params }: PageProps<"/aktuality/archiv/[rok]">): Promise<Metadata> {
  const { rok } = await params;
  const year = years.find((y) => y.slug === rok);
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
    alternates: { canonical: archiveYearHref(rok) },
  };
}

export default async function ArchivYearPage({ params }: PageProps<"/aktuality/archiv/[rok]">) {
  const { rok } = await params;
  if (!years.some((y) => y.slug === rok)) notFound();
  return <ArchivePage yearSlug={rok} />;
}
