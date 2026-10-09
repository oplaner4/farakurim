import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/news/EventDetail";
import { NewsPage } from "@/components/news/NewsPage";
import { events } from "@/content/news";
import { links, parish, siteOpenGraph } from "@/content/site";
import {
  eventHref,
  eventPageTitle,
  filterFromSlug,
  findEventById,
  NEWS_FILTER_META,
  NEWS_FILTERS,
} from "@/lib/news/events";

// One segment serves both the Aktuality filter pages (`/aktuality/tyden/`) and the event detail pages
// (`/aktuality/<event id>/`); a test keeps them apart. Static export: only the listed pages exist.
export const dynamicParams = false;

export function generateStaticParams() {
  const filterSlugs = NEWS_FILTERS.map((f) => NEWS_FILTER_META[f].slug).filter((slug) => slug !== "");
  return [...filterSlugs, ...events.map((e) => e.id)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/aktuality/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const filter = filterFromSlug(slug);
  // A filter page re-lists events of /aktuality/, so search engines index that page instead.
  if (filter) return { title: `Aktuality: ${NEWS_FILTER_META[filter].label}`, alternates: { canonical: links.news } };
  const event = findEventById(events, slug);
  if (!event) return { title: "Aktuality" };
  const description = event.lead ?? event.text;
  return {
    // "<Event title> – Římskokatolická farnost Kuřim" (design/DESIGN.md §13.5), not the "|" template.
    title: { absolute: `${eventPageTitle(event, events)} – ${parish.name}` },
    description,
    alternates: { canonical: eventHref(event) },
    openGraph: {
      ...siteOpenGraph,
      type: "article",
      authors: [parish.name],
      // Never the build time: it would change on every deploy.
      ...(event.published && { publishedTime: event.published }),
      title: event.title,
      description,
      url: eventHref(event),
      ...(event.poster && { images: [{ url: event.poster.src, alt: event.poster.alt }] }),
    },
  };
}

export default async function AktualitySlugPage({ params }: PageProps<"/aktuality/[slug]">) {
  const { slug } = await params;
  const filter = filterFromSlug(slug);
  if (filter) return <NewsPage filter={filter} />;
  const event = findEventById(events, slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
