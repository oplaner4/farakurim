import { notFound } from "next/navigation";
import { PlannedPageView, plannedPageMetadata } from "@/components/layout/PlannedPageView";
import { plannedPages } from "@/content/planned-pages";
import { findPlannedPage, pathSegments } from "@/lib/layout/planned-pages";

// Static export: the old site's pages not rebuilt yet, at their old URLs.
export const dynamicParams = false;

export function generateStaticParams() {
  return plannedPages.map((page) => ({ path: pathSegments(page.path) }));
}

export async function generateMetadata({ params }: PageProps<"/[...path]">) {
  return plannedPageMetadata(findPlannedPage(plannedPages, (await params).path));
}

export default async function PlannedPage({ params }: PageProps<"/[...path]">) {
  const page = findPlannedPage(plannedPages, (await params).path);
  if (!page) notFound();
  return <PlannedPageView page={page} />;
}
