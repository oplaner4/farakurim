import { ContactsPanel } from "@/components/home/ContactsPanel";
import { GallerySection } from "@/components/home/GallerySection";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { NewsSection } from "@/components/home/NewsSection";
import { NextMass } from "@/components/home/NextMass";
import { PetrklicPanel } from "@/components/home/PetrklicPanel";
import { WeekCalendar } from "@/components/home/WeekCalendar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { calendarHrefs, loadCalendarEntries } from "@/content/calendar";
import { albums } from "@/content/gallery";
import { events } from "@/content/news";
import { scheduleExceptions, serviceSheet } from "@/content/ohlasky";
import { petrklicIssues, petrklicTexts } from "@/content/petrklic";
import { carouselSlides, parish } from "@/content/site";
import { BUILD_TIME } from "@/lib/build-time";
import { addDays } from "date-fns";
import { currentNews } from "@/lib/news";
import { inPrague, pragueDate } from "@/lib/prague";

// Only events that can still show up are serialized for the client, which re-filters them by today's date.
const upcomingNews = currentNews(events, pragueDate(BUILD_TIME), Infinity);

// The week calendar's days from the build day on; three weeks, so a build a few days old still has them.
const weekRange = {
  from: pragueDate(BUILD_TIME),
  to: pragueDate(addDays(BUILD_TIME, 20, { in: inPrague })),
};

export default async function HomePage() {
  const weekEntries = await loadCalendarEntries(weekRange);
  return (
    <>
      <SiteHeader />
      <main id="obsah" className="flex flex-col">
        <h1 className="sr-only">{parish.name}</h1>
        {/* Mobile/tablet: full-bleed carousel with the card overlapping it. Desktop: side by side in the container. */}
        <div className="flex flex-col lg:mx-auto lg:w-full lg:max-w-page lg:flex-row lg:flex-wrap lg:gap-6 lg:px-8 lg:pt-10">
          <HeroCarousel slides={carouselSlides} />
          <NextMass
            renderedAt={BUILD_TIME}
            exceptions={scheduleExceptions}
            sheet={{ pdfUrl: serviceSheet.pdfUrl, validFrom: serviceSheet.validFrom, validTo: serviceSheet.validTo }}
          />
        </div>
        <div className="container-page">
          <WeekCalendar entries={weekEntries} range={weekRange} hrefs={calendarHrefs} renderedAt={BUILD_TIME} />
          <NewsSection events={upcomingNews} renderedAt={BUILD_TIME} />
          <GallerySection albums={albums} />
          <div className="grid grid-cols-1 gap-12 pt-10 pb-12 md:grid-cols-2 md:gap-4 md:py-14 lg:grid-fit-440 lg:gap-6 lg:py-20">
            <PetrklicPanel issue={petrklicIssues[0]} description={petrklicTexts.home} />
            <ContactsPanel />
          </div>
        </div>
      </main>
    </>
  );
}
