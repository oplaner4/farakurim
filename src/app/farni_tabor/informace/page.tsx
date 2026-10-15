import type { Metadata } from "next";
import { CampActivities } from "@/components/camp/CampActivities";
import { CampAudience } from "@/components/camp/CampAudience";
import { CampHero } from "@/components/camp/CampHero";
import { CampPageHeading } from "@/components/camp/CampPageHeading";
import { CampQuotes } from "@/components/camp/CampQuotes";
import { NextCampPanel } from "@/components/camp/NextCampPanel";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { campHero, campQuotes, nextCamp } from "@/content/camp";
import { links } from "@/content/site";

const lead = "Týden her, dobrodružství, přátelství a společné modlitby pro děti a mladé z farnosti.";

export const metadata: Metadata = {
  title: "O táboru",
  alternates: { canonical: links.campAbout },
  description: `Farní tábor: ${lead} Pro koho je, co na něm děláme a jak se připravuje tábor ${nextCamp.year}.`,
};

/** O táboru (design/DESIGN.md §29.2): the hero, the next camp, how it began, who it is for, what we do and voices. */
export default function CampAboutPage() {
  return (
    <>
      <SiteHeader currentHref={links.campAbout} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <CampPageHeading page="O táboru" intro={lead} />
        <CampHero hero={campHero} />
        {/* Mobile and tablet: the panel right under the hero; desktop: beside "Jak to začalo" (1.5fr / 1fr). */}
        <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-5 lg:gap-8">
          <NextCampPanel camp={nextCamp} className="lg:col-span-2 lg:col-start-4 lg:row-start-1" />
          <section aria-labelledby="zacatky" className="flex flex-col gap-3.5 lg:col-span-3 lg:row-start-1">
            <SectionHeading id="zacatky" title="Jak to začalo" color="magenta" small />
            <p className="text-16 leading-relaxed md:text-17 lg:leading-loose">
              Tábory pořádáme od roku 2019. Vznikly z iniciativy <a href={links.youth}>společenství mladých</a> naší
              farnosti.
            </p>
            <p className="text-16 leading-relaxed md:text-17 lg:leading-loose">
              Chtěli jsme sloužit farnosti, naučit se něco nového a tvořit spolu s lidmi, se kterými si rozumíme. Z toho
              vyrostlo společenství vedoucích, praktikantů a dětí, které se každé léto vrací.
            </p>
          </section>
        </div>
        <CampAudience />
        <CampActivities />
        <CampQuotes quotes={campQuotes} />
      </main>
    </>
  );
}
