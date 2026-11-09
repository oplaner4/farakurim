import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupPageView } from "@/components/activities/GroupPageView";
import { NextMeeting } from "@/components/activities/NextMeeting";
import { PageShell } from "@/components/layout/PageShell";
import { loadCalendarEntries } from "@/server/calendar";
import { groupPages } from "@/content/groups";
import { isMeeting, meetingRange } from "@/lib/activities/meetings";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";

// Static export: one page per group (design/DESIGN.md §27), under Seznam aktivit like its breadcrumb.
export const dynamicParams = false;

export function generateStaticParams() {
  return groupPages.map((group) => ({ group: group.id }));
}

const findGroup = (id: string) => groupPages.find((group) => group.id === id);

export async function generateMetadata({ params }: PageProps<"/aktivity/[group]">): Promise<Metadata> {
  const { group: id } = await params;
  const group = findGroup(id);
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
export default async function GroupPage({ params }: PageProps<"/aktivity/[group]">) {
  const { group: id } = await params;
  const group = findGroup(id);
  if (!group) notFound();
  return (
    <PageShell currentHref={group.href}>
      <GroupPageView
        group={group}
        groups={groupPages}
        nextMeeting={group.nextMeeting && (await nextMeeting(group.nextMeeting.calendarTitle))}
      />
    </PageShell>
  );
}
