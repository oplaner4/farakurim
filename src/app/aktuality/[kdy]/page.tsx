import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsPage } from "@/components/NewsPage";
import { filterFromSlug, NEWS_FILTER_META, NEWS_FILTERS } from "@/lib/news";

// Static export: only the filter pages listed here exist.
export const dynamicParams = false;

export function generateStaticParams() {
  return NEWS_FILTERS.map((f) => NEWS_FILTER_META[f].slug)
    .filter((slug) => slug !== "")
    .map((kdy) => ({ kdy }));
}

export async function generateMetadata({ params }: PageProps<"/aktuality/[kdy]">): Promise<Metadata> {
  const filter = filterFromSlug((await params).kdy);
  return { title: filter ? `Aktuality: ${NEWS_FILTER_META[filter].label}` : "Aktuality" };
}

export default async function AktualityFilterPage({ params }: PageProps<"/aktuality/[kdy]">) {
  const filter = filterFromSlug((await params).kdy);
  if (!filter) notFound();
  return <NewsPage filter={filter} />;
}
