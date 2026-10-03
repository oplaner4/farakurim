import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { ChurchSchedule } from "@/components/services/ChurchCard";
import { InfoCards } from "@/components/services/InfoCards";
import { RegularServices } from "@/components/services/RegularServices";
import { OhlaskyPanel } from "@/components/services/OhlaskyPanel";
import { WeekSchedule } from "@/components/services/WeekSchedule";
import { PageHeading } from "@/components/ui/PageHeading";
import { places, regularServices, sacraments } from "@/content/masses";
import { serviceSheet } from "@/content/ohlasky";
import { events } from "@/content/news";
import { links } from "@/content/site";
import type { PlaceId } from "@/content/types";
import { BUILD_TIME } from "@/lib/build-time";
import { mapHref } from "@/lib/links";
import { weeklySchedule } from "@/lib/masses";
import { eventHref } from "@/lib/news";
import { publicDays } from "@/lib/service-sheet";

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

// Only what is public reaches the page (and the client bundle), with place names instead of IDs.
const weekDays = publicDays(serviceSheet.days).map((day) => ({
  ...day,
  rows: day.rows.map((row) => ({ ...row, place: places[row.place as PlaceId]?.name ?? row.place })),
}));

const newsHref = (id: string) => {
  const event = events.find((e) => e.id === id);
  return event && eventHref(event);
};

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
        <OhlaskyPanel sheet={serviceSheet} newsHref={newsHref} />
        <WeekSchedule days={weekDays} renderedAt={BUILD_TIME} />
        <RegularServices churches={churches} renderedAt={BUILD_TIME} />
        <InfoCards confession={sacraments.confession} baptism={sacraments.baptism} />
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
