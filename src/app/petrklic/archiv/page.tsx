import type { Metadata } from "next";
import { ArchivePage } from "@/components/petrklic/ArchivePage";

// Not indexed (and left out of the sitemap): the issues are reached from /petrklic/ and the menu.
export const metadata: Metadata = {
  title: "Archiv Petrklíče",
  robots: { index: false },
  description: "Všechna čísla zpravodaje Petrklíč od roku 2006 ke čtení a ke stažení ve formátu PDF.",
};

export default function PetrklicArchivePage() {
  return <ArchivePage />;
}
