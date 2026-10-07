import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchivePage, PETRKLIC_YEARS } from "@/components/petrklic/ArchivePage";
import { archiveYearHref } from "@/lib/petrklic/issues";

// Static export: one page per year link.
export const dynamicParams = false;

export function generateStaticParams() {
  return PETRKLIC_YEARS.map((y) => ({ rok: String(y.year) }));
}

export async function generateMetadata({ params }: PageProps<"/petrklic/archiv/[rok]">): Promise<Metadata> {
  const { rok } = await params;
  return { title: `Archiv Petrklíče ${rok}`, alternates: { canonical: archiveYearHref(Number(rok)) } };
}

export default async function PetrklicYearPage({ params }: PageProps<"/petrklic/archiv/[rok]">) {
  const { rok } = await params;
  const year = Number(rok);
  if (!PETRKLIC_YEARS.some((y) => y.year === year)) notFound();
  return <ArchivePage year={year} />;
}
