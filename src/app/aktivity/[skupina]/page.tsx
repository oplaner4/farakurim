import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupPageView } from "@/components/activities/GroupPageView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { groupLinks, groupPages } from "@/content/groups";

// Static export: one page per group with a page (design/DESIGN.md §27), under Seznam aktivit like its breadcrumb.
export const dynamicParams = false;

export function generateStaticParams() {
  return groupPages.map((group) => ({ skupina: group.id }));
}

const findGroup = (id: string) => groupPages.find((group) => group.id === id);

export async function generateMetadata({ params }: PageProps<"/aktivity/[skupina]">): Promise<Metadata> {
  const group = findGroup((await params).skupina);
  return group ? { title: group.name, description: group.description ?? group.tagline } : {};
}

/** A group page (Schola first): the template filled with the group's data. */
export default async function GroupPage({ params }: PageProps<"/aktivity/[skupina]">) {
  const group = findGroup((await params).skupina);
  if (!group) notFound();
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
