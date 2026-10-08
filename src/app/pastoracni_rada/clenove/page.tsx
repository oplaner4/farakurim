import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CouncilMembers } from "@/components/parish/CouncilMembers";
import { PageHeading } from "@/components/ui/PageHeading";
import { councilMeetings, parishCouncil } from "@/content/parish-council";
import { links } from "@/content/site";
import { formatLongDate } from "@/lib/shared/czech";
import { ArrowLink } from "@/components/ui/ArrowLink";

const lead = "Pastorační rada farnosti (PRF) je poradním orgánem kněze při pastoraci farnosti.";

export const metadata: Metadata = {
  title: "Pastorační rada – členové",
  alternates: { canonical: links.parishCouncil },
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
          <ArrowLink href={links.councilMinutes} tone="blue" className="self-start">
            Zápisy ze zasedání (poslední {formatLongDate(latest.date)})
          </ArrowLink>
        )}
      </main>
    </>
  );
}
