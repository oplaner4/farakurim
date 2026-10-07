import type { Metadata } from "next";
import { ActivityList } from "@/components/activities/ActivityList";
import { JoinPanel } from "@/components/activities/JoinPanel";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageHeading } from "@/components/ui/PageHeading";
import { activityGroups } from "@/content/activities";
import { links } from "@/content/site";

const lead = "Co se ve farnosti děje a na koho se obrátit. MK = Moravské Knínice.";

export const metadata: Metadata = {
  title: "Seznam aktivit",
  alternates: { canonical: links.activities },
  description:
    "Pravidelné i jednorázové aktivity farnosti Kuřim, Moravské Knínice a Česká a kontaktní osoby: schola, ministranti, farní kavárna, společenství a další.",
};

/** Seznam aktivit (design/DESIGN.md §25): every activity of the parish with whom to ask, searchable. */
export default function ActivitiesPage() {
  return (
    <>
      <SiteHeader currentHref={links.activities} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Seznam aktivit" color="green" size="standard" intro={lead} />
        <ActivityList groups={activityGroups} />
        <JoinPanel />
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
