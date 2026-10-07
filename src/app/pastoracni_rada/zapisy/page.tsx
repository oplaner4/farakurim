import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CouncilMeetingReport, meetingAnchor } from "@/components/parish/CouncilMeetingReport";
import { PageHeading } from "@/components/ui/PageHeading";
import { councilMeetings } from "@/content/parish-council";
import { links } from "@/content/site";
import { formatNumericDate } from "@/lib/shared/czech";

const lead = "Zprávy ze zasedání pastorační rady farnosti (PRF), od nejnovějšího.";

export const metadata: Metadata = {
  title: "Zápisy pastorační rady",
  description: `${lead} Co rada projednala a jaké akce farnost připravuje.`,
};

/** Zápisy pastorační rady (no mockup): the meeting reports, newest first, with a list of their dates. */
export default function CouncilMinutesPage() {
  return (
    <>
      <SiteHeader currentHref={links.councilMinutes} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading
          title="Zápisy pastorační rady"
          color="blue"
          size="standard"
          parents={[{ label: "Pastorační rada", href: links.parishCouncil }]}
          intro={lead}
        />
        <nav aria-label="Zasedání" className="-mt-1">
          <ul className="flex flex-wrap gap-2">
            {councilMeetings.map((meeting) => (
              <li key={meeting.date}>
                <a
                  href={`#${meetingAnchor(meeting)}`}
                  className="flex min-h-11 items-center rounded-full bg-surface px-4 text-14 font-bold text-blue-ink no-underline hover:bg-blue-tint hover:text-ink"
                >
                  {formatNumericDate(meeting.date)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {councilMeetings.map((meeting) => (
          <CouncilMeetingReport key={meeting.date} meeting={meeting} />
        ))}
      </main>
    </>
  );
}
