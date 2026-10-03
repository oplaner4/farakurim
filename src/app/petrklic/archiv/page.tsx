import type { Metadata } from "next";
import { ArchivePage } from "@/components/petrklic/ArchivePage";

export const metadata: Metadata = {
  title: "Archiv Petrklíče",
  description: "Všechna čísla zpravodaje Petrklíč od roku 2006 ke čtení a ke stažení ve formátu PDF.",
};

export default function PetrklicArchivePage() {
  return <ArchivePage />;
}
