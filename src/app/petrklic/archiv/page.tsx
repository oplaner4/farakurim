import type { Metadata } from "next";
import { ArchivePage } from "@/components/petrklic/ArchivePage";
import { links } from "@/content/site";

export const metadata: Metadata = {
  title: "Archiv Petrklíče",
  alternates: { canonical: links.petrklicArchive },
  description: "Všechna čísla zpravodaje Petrklíč od roku 2006 ke čtení a ke stažení ve formátu PDF.",
};

export default function PetrklicArchivePage() {
  return <ArchivePage />;
}
