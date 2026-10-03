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
import { currentNews } from "@/lib/news";
import { weekRange } from "@/lib/agenda";
import { pragueDate } from "@/lib/prague";

const buildDay = pragueDate(BUILD_TIME);

// Only events that can still show up are serialized for the client, which re-filters them by today's date.
const upcomingNews = currentNews(events, buildDay, Infinity);

// The week calendar's weeks: the previous one, the build's and four more, so a build a few weeks old still has the
// current week and the visitor can page a little without an API key.
const calendarRange = { from: weekRange(buildDay, -1).from, to: weekRange(buildDay, 4).to };

export default async function HomePage() {
  const weekEntries = await loadCalendarEntries(calendarRange);
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
          <WeekCalendar entries={weekEntries} range={calendarRange} hrefs={calendarHrefs} renderedAt={BUILD_TIME} />
          <NewsSection events={upcomingNews} renderedAt={BUILD_TIME} />
          <GallerySection albums={albums} />
          <div className="grid grid-cols-1 gap-12 pt-10 pb-12 md:grid-cols-2 md:gap-4 md:py-14 lg:grid-fit-440 lg:gap-6 lg:py-20">
            <PetrklicPanel issue={petrklicIssues[0]} description={petrklicTexts.home} />
            <ContactsPanel />
          </div>
        </div>
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
