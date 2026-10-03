import type { Metadata } from "next";
import { ArchivePage } from "@/components/ArchivePage";

export const metadata: Metadata = {
  title: "Archiv aktualit",
  description: "Proběhlé akce, pozvánky a plakáty farnosti Kuřim.",
};

export default function ArchivDefaultPage() {
  return <ArchivePage yearSlug="" />;
}
