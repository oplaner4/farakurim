import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupPageView } from "@/components/activities/GroupPageView";
import { PlannedPageView, plannedPageMetadata } from "@/components/layout/PlannedPageView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { groupLinks, groupPages } from "@/content/groups";
import { plannedPages } from "@/content/planned-pages";
import { links } from "@/content/site";
import { findPlannedPage, pathSegments, plannedSegments } from "@/lib/shared/planned-pages";

// Static export: one page per group (design/DESIGN.md §27), under Seznam aktivit like its breadcrumb. Groups not
// rebuilt yet show their placeholder (`content/planned-pages.ts`).
export const dynamicParams = false;

const ACTIVITIES = pathSegments(links.activities);

export function generateStaticParams() {
  const planned = plannedSegments(plannedPages, ACTIVITIES, 1).map(([skupina]) => skupina);
  return [...groupPages.map((group) => group.id), ...planned].map((skupina) => ({ skupina }));
}

const findGroup = (id: string) => groupPages.find((group) => group.id === id);
const findPlanned = (id: string) => findPlannedPage(plannedPages, [...ACTIVITIES, id]);

export async function generateMetadata({ params }: PageProps<"/aktivity/[skupina]">): Promise<Metadata> {
  const { skupina } = await params;
  const group = findGroup(skupina);
  if (!group) return plannedPageMetadata(findPlanned(skupina));
  return { title: group.name, description: group.description ?? group.tagline };
}

/** A group page (Schola first): the template filled with the group's data. */
export default async function GroupPage({ params }: PageProps<"/aktivity/[skupina]">) {
  const { skupina } = await params;
  const group = findGroup(skupina);
  if (!group) {
    const planned = findPlanned(skupina);
    if (!planned) notFound();
    return <PlannedPageView page={planned} />;
  }
  return (
    <>
      <SiteHeader currentHref={group.href} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <GroupPageView group={group} groups={groupLinks} />
      </main>
    </>
  );
}
