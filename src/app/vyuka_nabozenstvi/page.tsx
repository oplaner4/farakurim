import type { Metadata } from "next";
import { EducationCards } from "@/components/activities/EducationCards";
import { SchoolTimetable } from "@/components/activities/SchoolTimetable";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { religiousEducation } from "@/content/religious-education";
import { links } from "@/content/site";

const lead =
  "Náboženství pro děti z 1. až 9. třídy na školách v Kuřimi, v Moravských Knínicích a na faře. Přihlásit se může každé dítě.";

export const metadata: Metadata = {
  title: "Výuka náboženství",
  alternates: { canonical: links.religiousEducation },
  description: `${lead} Rozvrh na školní rok ${religiousEducation.schoolYear}, přihláška a kontakt.`,
};

// Without JS: no tabs; every school's panel shows with its heading (the tabs are a JS enhancement).
const noscriptStyle =
  "[data-js-only]{display:none}" +
  "[role=tabpanel]{display:flex}" +
  "[data-noscript-heading]{position:static;width:auto;height:auto;margin:0;overflow:visible;clip:auto;clip-path:none;white-space:normal}";

/** Výuka náboženství (design/DESIGN.md §24): the timetable per school, the application, contact and absence. */
export default function ReligiousEducationPage() {
  return (
    <>
      <SiteHeader currentHref={links.religiousEducation} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Výuka náboženství" color="green" size="standard" intro={lead} />
        <section aria-labelledby="rozvrh" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <SectionHeading id="rozvrh" title="Rozvrh výuky" color="green" small />
            <span className="text-14 text-muted">Školní rok {religiousEducation.schoolYear}</span>
          </div>
          <SchoolTimetable schools={religiousEducation.schools} />
        </section>
        <EducationCards education={religiousEducation} />
        <noscript>
          <style>{noscriptStyle}</style>
        </noscript>
      </main>
    </>
  );
}
