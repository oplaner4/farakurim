import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/news/EventDetail";
import { NewsPage } from "@/components/news/NewsPage";
import { events } from "@/content/news";
import { links, parish } from "@/content/site";
import {
  eventHref,
  eventSlug,
  filterFromSlug,
  findEventBySlug,
  NEWS_FILTER_META,
  NEWS_FILTERS,
} from "@/lib/news/events";

// One segment serves both the Aktuality filter pages (`/aktuality/tyden/`) and the event detail pages
// (`/aktuality/<event slug>/`); a test keeps the slugs apart. Static export: only the listed pages exist.
export const dynamicParams = false;

export function generateStaticParams() {
  const filterSlugs = NEWS_FILTERS.map((f) => NEWS_FILTER_META[f].slug).filter((slug) => slug !== "");
  return [...filterSlugs, ...events.map(eventSlug)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/aktuality/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const filter = filterFromSlug(slug);
  // A filter page re-lists events of /aktuality/, so search engines index that page instead.
  if (filter) return { title: `Aktuality: ${NEWS_FILTER_META[filter].label}`, alternates: { canonical: links.news } };
  const event = findEventBySlug(events, slug);
  if (!event) return { title: "Aktuality" };
  const description = event.lead ?? event.text;
  return {
    // "<Event title> – Římskokatolická farnost Kuřim" (design/DESIGN.md §13.5), not the "|" template.
    title: { absolute: `${event.title} – ${parish.name}` },
    description,
    alternates: { canonical: eventHref(event) },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      url: eventHref(event),
      images: event.poster && [{ url: event.poster.src, alt: event.poster.alt }],
    },
  };
}

export default async function AktualitySlugPage({ params }: PageProps<"/aktuality/[slug]">) {
  const { slug } = await params;
  const filter = filterFromSlug(slug);
  if (filter) return <NewsPage filter={filter} />;
  const event = findEventBySlug(events, slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
