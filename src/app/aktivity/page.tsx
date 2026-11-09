import type { Metadata } from "next";
import { ActivityList } from "@/components/activities/ActivityList";
import { JoinPanel } from "@/components/activities/JoinPanel";
import { PageShell } from "@/components/layout/PageShell";
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
    <PageShell currentHref={links.activities}>
      <PageHeading title="Seznam aktivit" color="green" size="standard" intro={lead} />
      <ActivityList groups={activityGroups} />
      <JoinPanel />
    </PageShell>
  );
}
