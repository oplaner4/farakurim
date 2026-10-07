import type { CouncilMeeting } from "@/content/types/parish";
import { formatLongDate } from "@/lib/shared/czech";
import { withExternalLinkTargets } from "@/lib/shared/links";

/** The anchor of a meeting on Zápisy pastorační rady (`#zasedani-2026-02-02`). */
export const meetingAnchor = (meeting: CouncilMeeting) => `zasedani-${meeting.date}`;

/** One report of Zápisy pastorační rady: the date as its heading and the council's text. */
export function CouncilMeetingReport({ meeting }: { meeting: CouncilMeeting }) {
  const id = meetingAnchor(meeting);
  return (
    <article
      aria-labelledby={id}
      className="flex scroll-mt-4 flex-col gap-3 rounded-24 bg-surface p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7"
    >
      <h2 id={id} className="text-22 leading-snug font-bold md:text-26">
        Zasedání {formatLongDate(meeting.date)}
      </h2>
      {/* The council's report (paragraphs, lists, links). */}
      <div
        className="rich-text max-w-170 text-15 text-ink-2 [&_a]:font-bold [&_a]:break-all"
        dangerouslySetInnerHTML={{ __html: withExternalLinkTargets(meeting.html) }}
      />
    </article>
  );
}
