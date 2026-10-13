import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchivePage, PETRKLIC_YEARS } from "@/components/petrklic/ArchivePage";

// Static export: one page per year link.
export const dynamicParams = false;

export function generateStaticParams() {
  return PETRKLIC_YEARS.map((y) => ({ year: String(y.year) }));
}

// Not indexed, like /petrklic/archiv/.
export async function generateMetadata({ params }: PageProps<"/petrklic/archiv/[year]">): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Archiv Petrklíče ${year}`,
    description: `Čísla farního zpravodaje Petrklíč z roku ${year} ke čtení a ke stažení ve formátu PDF.`,
    robots: { index: false },
  };
}

export default async function PetrklicYearPage({ params }: PageProps<"/petrklic/archiv/[year]">) {
  const year = Number((await params).year);
  if (!PETRKLIC_YEARS.some((y) => y.year === year)) notFound();
  return <ArchivePage year={year} />;
}
