import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
    <>
      <SiteHeader currentHref={links.priestsFromParish} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
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
      </main>
    </>
  );
}
