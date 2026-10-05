import { notFound } from "next/navigation";
import { PlannedPageView, plannedPageMetadata } from "@/components/layout/PlannedPageView";
import { links } from "@/content/site";
import { plannedPages } from "@/content/planned-pages";
import { findPlannedPage, pathSegments, plannedSegments } from "@/lib/shared/planned-pages";

// Static export: the old site's pages not rebuilt yet, at their old URLs (those under /aktivity/ have their routes).
export const dynamicParams = false;

const ACTIVITIES = pathSegments(links.activities)[0];

export function generateStaticParams() {
  return plannedSegments(plannedPages, [])
    .filter((segments) => segments[0] !== ACTIVITIES)
    .map((stranka) => ({ stranka }));
}

export async function generateMetadata({ params }: PageProps<"/[...stranka]">) {
  return plannedPageMetadata(findPlannedPage(plannedPages, (await params).stranka));
}

export default async function PlannedPage({ params }: PageProps<"/[...stranka]">) {
  const page = findPlannedPage(plannedPages, (await params).stranka);
  if (!page) notFound();
  return <PlannedPageView page={page} />;
}
