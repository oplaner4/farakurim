import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARCHIVE_YEARS, ArchivePage } from "@/components/news/ArchivePage";
import { archiveYears } from "@/lib/news/archive";

// Static export: every year button other than the default (the newest year) has a page.
export const dynamicParams = false;

const years = archiveYears(ARCHIVE_YEARS).filter((y) => y.slug !== "");

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
