import { ContactsPanel } from "@/components/ContactsPanel";
import { GallerySection } from "@/components/GallerySection";
import { HeroCarousel } from "@/components/HeroCarousel";
import { NewsSection } from "@/components/NewsSection";
import { NextMass } from "@/components/NextMass";
import { PetrklicPanel } from "@/components/PetrklicPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { albums } from "@/content/gallery";
import { events } from "@/content/news";
import { latestPetrklic } from "@/content/petrklic";
import { carouselSlides, parish } from "@/content/site";
import { BUILD_TIME } from "@/lib/build-time";
import { currentNews } from "@/lib/news";
import { pragueDate } from "@/lib/prague";

// Only events that can still show up are serialized for the client, which re-filters them by today's date.
const upcomingNews = currentNews(events, pragueDate(BUILD_TIME), Infinity);

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="obsah" className="flex flex-col">
        <h1 className="sr-only">{parish.name}</h1>
        {/* Mobile/tablet: full-bleed carousel with the card overlapping it. Desktop: side by side in the container. */}
        <div className="flex flex-col lg:mx-auto lg:w-full lg:max-w-page lg:flex-row lg:flex-wrap lg:gap-6 lg:px-8 lg:pt-10">
          <HeroCarousel slides={carouselSlides} />
          <NextMass renderedAt={BUILD_TIME} />
        </div>
        <div className="container-page">
          <NewsSection events={upcomingNews} renderedAt={BUILD_TIME} />
          <GallerySection albums={albums} />
          <div className="grid grid-cols-1 gap-12 pt-10 pb-12 md:grid-cols-2 md:gap-4 md:py-14 lg:grid-fit-440 lg:gap-6 lg:py-20">
            <PetrklicPanel issue={latestPetrklic} />
            <ContactsPanel />
          </div>
        </div>
      </main>
    </>
  );
}
