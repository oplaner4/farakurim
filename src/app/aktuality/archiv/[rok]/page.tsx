import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARCHIVE_LATEST_YEAR, ARCHIVE_OLDEST_YEAR, ArchivePage } from "@/components/news/ArchivePage";
import { archivePages } from "@/lib/news";

// Static export: the year buttons other than the default, plus every older year (so its URL outlives its button).
export const dynamicParams = false;

const years = archivePages(ARCHIVE_LATEST_YEAR, ARCHIVE_OLDEST_YEAR).filter((y) => y.slug !== "");

export function generateStaticParams() {
  return years.map((y) => ({ rok: y.slug }));
}

export async function generateMetadata({ params }: PageProps<"/aktuality/archiv/[rok]">): Promise<Metadata> {
  const { rok } = await params;
  const year = years.find((y) => y.slug === rok);
  return { title: year ? `Archiv aktualit: ${year.label}` : "Archiv aktualit" };
}

export default async function ArchivYearPage({ params }: PageProps<"/aktuality/archiv/[rok]">) {
  const { rok } = await params;
  if (!years.some((y) => y.slug === rok)) notFound();
  return <ArchivePage yearSlug={rok} />;
}
