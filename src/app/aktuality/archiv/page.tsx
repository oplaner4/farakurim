import type { Metadata } from "next";
import { ArchivePage } from "@/components/news/ArchivePage";
import { links } from "@/content/site";

export const metadata: Metadata = {
  title: "Archiv aktualit",
  alternates: { canonical: links.newsArchive },
  description: "Proběhlé akce, pozvánky a plakáty farnosti Kuřim.",
};

export default function ArchivDefaultPage() {
  return <ArchivePage yearSlug="" />;
}
