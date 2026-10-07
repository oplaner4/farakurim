import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CouncilMembers } from "@/components/parish/CouncilMembers";
import { ArrowRightIcon } from "@/components/ui/icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { councilMeetings, parishCouncil } from "@/content/parish-council";
import { links } from "@/content/site";
import { formatLongDate } from "@/lib/shared/czech";

const lead = "Pastorační rada farnosti (PRF) je poradním orgánem kněze při pastoraci farnosti.";

export const metadata: Metadata = {
  title: "Pastorační rada – členové",
  description: `${lead} Členové rady, funkční období a e-mail.`,
};

/** Pastorační rada – členové (no mockup): the members of the current term and a link to the meeting reports. */
export default function ParishCouncilPage() {
  const [latest] = councilMeetings;
  return (
    <>
      <SiteHeader currentHref={links.parishCouncil} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Pastorační rada" color="blue" size="standard" intro={lead} />
        <CouncilMembers council={parishCouncil} />
        {latest && (
          <a
            href={links.councilMinutes}
            className="flex min-h-11 items-center gap-1.5 self-start font-bold text-blue-ink hover:text-ink"
          >
            Zápisy ze zasedání (poslední {formatLongDate(latest.date)})
            <ArrowRightIcon size={18} />
          </a>
        )}
      </main>
    </>
  );
}
