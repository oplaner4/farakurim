import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { ChurchSchedule } from "@/components/services/ChurchCard";
import { InfoCards } from "@/components/services/InfoCards";
import { RegularServices } from "@/components/services/RegularServices";
import { ThisWeekPanel } from "@/components/services/ThisWeekPanel";
import { PageHeading } from "@/components/ui/PageHeading";
import { places, regularServices, sacraments, serviceSheet } from "@/content/masses";
import { links } from "@/content/site";
import type { PlaceId } from "@/content/types";
import { BUILD_TIME } from "@/lib/build-time";
import { mapHref } from "@/lib/links";
import { weeklySchedule } from "@/lib/masses";

export const metadata: Metadata = {
  title: "Pořad bohoslužeb",
  description:
    "Pravidelné bohoslužby v Kuřimi, Moravských Knínicích a Jinačovicích, ohlášky na tento týden, svátost smíření a křty.",
};

// The schedule is grouped at build time; the client only filters it.
const churches: ChurchSchedule[] = (Object.keys(places) as PlaceId[]).map((id) => {
  const { name, church, color, mapQuery, byAgreement } = places[id];
  return {
    id,
    place: name,
    church,
    color,
    mapHref: mapHref(mapQuery),
    byAgreement,
    days: weeklySchedule(regularServices, id),
  };
});

/** Pořad bohoslužeb (design/DESIGN.md §14). */
export default function ServicesPage() {
  return (
    <>
      <SiteHeader currentHref={links.services} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-7 pt-5 pb-12 md:gap-9 md:pt-7 md:pb-14 lg:gap-12 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Pořad bohoslužeb" color="blue" size="standard" />
        <ThisWeekPanel sheet={serviceSheet} />
        <RegularServices churches={churches} renderedAt={BUILD_TIME} />
        <InfoCards confession={sacraments.confession} baptism={sacraments.baptism} />
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
