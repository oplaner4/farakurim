import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupPageView } from "@/components/activities/GroupPageView";
import { NextMeeting } from "@/components/activities/NextMeeting";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { loadCalendarEntries } from "@/content/calendar";
import { groupPages } from "@/content/groups";
import { isMeeting, meetingRange } from "@/lib/activities/meetings";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";

// Static export: one page per group (design/DESIGN.md §27), under Seznam aktivit like its breadcrumb.
export const dynamicParams = false;

export function generateStaticParams() {
  return groupPages.map((group) => ({ skupina: group.id }));
}

const findGroup = (id: string) => groupPages.find((group) => group.id === id);

export async function generateMetadata({ params }: PageProps<"/aktivity/[skupina]">): Promise<Metadata> {
  const { skupina } = await params;
  const group = findGroup(skupina);
  if (!group) notFound();
  return {
    title: group.name,
    description: group.description ?? group.tagline,
    alternates: { canonical: group.href },
  };
}

/** "Příští setkání": the group's meetings in the eight weeks from the build, re-read by the browser. */
async function nextMeeting(calendarTitle: string) {
  const range = meetingRange(pragueDate(BUILD_TIME));
  const entries = (await loadCalendarEntries(range)).filter((e) => isMeeting(e, calendarTitle));
  return <NextMeeting entries={entries} range={range} calendarTitle={calendarTitle} renderedAt={BUILD_TIME} />;
}

/** A group page: the template filled with the group's data. */
export default async function GroupPage({ params }: PageProps<"/aktivity/[skupina]">) {
  const { skupina } = await params;
  const group = findGroup(skupina);
  if (!group) notFound();
  return (
    <>
      <SiteHeader currentHref={group.href} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <GroupPageView
          group={group}
          groups={groupPages}
          nextMeeting={group.nextMeeting && (await nextMeeting(group.nextMeeting.calendarTitle))}
        />
      </main>
    </>
  );
}
