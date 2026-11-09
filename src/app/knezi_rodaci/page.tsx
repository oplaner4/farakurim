import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { NativePriestCard } from "@/components/parish/NativePriestCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { nativePriests } from "@/content/native-priests";
import { links } from "@/content/site";

const lead = "Kněží, kteří se narodili v kuřimské farnosti, od 19. století po současnost.";

export const metadata: Metadata = {
  title: "Kněží – rodáci kuřimské farnosti",
  alternates: { canonical: links.priestsFromParish },
  description: `${lead} Data narození, kněžského svěcení a úmrtí.`,
};

/** Kněží – rodáci (no mockup): one card per priest, in the old page's order. */
export default function NativePriestsPage() {
  return (
    <PageShell currentHref={links.priestsFromParish}>
      <PageHeading
        title="Kněží – rodáci kuřimské farnosti"
        crumb="Kněží – rodáci"
        color="blue"
        size="standard"
        intro={lead}
      />
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {nativePriests.map((priest) => (
          <NativePriestCard key={priest.name} priest={priest} />
        ))}
      </ul>
      <p className="text-15 text-ink-2">
        Historii farnosti přibližuje{" "}
        <a href={links.chronicle} className="font-bold">
          Kronika farnosti
        </a>
        .
      </p>
    </PageShell>
  );
}
