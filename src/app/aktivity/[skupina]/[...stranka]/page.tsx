import { notFound } from "next/navigation";
import { PlannedPageView, plannedPageMetadata } from "@/components/layout/PlannedPageView";
import { links } from "@/content/site";
import { plannedPages } from "@/content/planned-pages";
import { findPlannedPage, pathSegments, plannedSegments } from "@/lib/shared/planned-pages";

// Static export: a group's subpages not rebuilt yet (the extra catechesis under Katecheze pro děti).
export const dynamicParams = false;

const ACTIVITIES = pathSegments(links.activities);

export function generateStaticParams() {
  return plannedSegments(plannedPages, ACTIVITIES)
    .filter((rest) => rest.length > 1)
    .map(([skupina, ...stranka]) => ({ skupina, stranka }));
}

const pageAt = async (params: PageProps<"/aktivity/[skupina]/[...stranka]">["params"]) => {
  const { skupina, stranka } = await params;
  return findPlannedPage(plannedPages, [...ACTIVITIES, skupina, ...stranka]);
};

export async function generateMetadata({ params }: PageProps<"/aktivity/[skupina]/[...stranka]">) {
  return plannedPageMetadata(await pageAt(params));
}

export default async function GroupSubpage({ params }: PageProps<"/aktivity/[skupina]/[...stranka]">) {
  const page = await pageAt(params);
  if (!page) notFound();
  return <PlannedPageView page={page} />;
}
