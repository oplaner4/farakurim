import type { Metadata } from "next";
import { ChurchesCard } from "@/components/contacts/ChurchesCard";
import { OfficeHoursCard } from "@/components/contacts/OfficeHoursCard";
import { ParishOfficePanel } from "@/components/contacts/ParishOfficePanel";
import { PriestCard } from "@/components/contacts/PriestCard";
import { SocialCard } from "@/components/contacts/SocialCard";
import { SupportCard } from "@/components/contacts/SupportCard";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { contacts, links, SITE_URL } from "@/content/site";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";
import { jsonLdScript, parishJsonLd } from "@/lib/shared/structured-data";

export const metadata: Metadata = {
  title: "Kontakty",
  alternates: { canonical: links.contacts },
  description:
    "Fara Kuřim, Křížkovského 55/5: telefon, e-mail, úřední hodiny, duchovní správce, kostely farnosti a bankovní účet.",
};

/*
 * Kontakty (design/DESIGN.md §15). Mobile: one column. Tablet: a 2-column grid, Fara and "Sledujte nás" full
 * width. Desktop: 3 columns; Fara spans two beside Správce + Hodiny (stacked, Správce on top), then a row of three.
 */
export default function ContactsPage() {
  return (
    <PageShell currentHref={links.contacts}>
      <PageHeading title="Kontakty" color="blue" size="standard" />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-6 lg:grid-cols-3 lg:gap-6">
        <ParishOfficePanel className="md:col-span-2 lg:self-start" />
        <div className="contents lg:flex lg:flex-col-reverse lg:justify-end lg:gap-6">
          <OfficeHoursCard hours={contacts.officeHours} renderedAt={BUILD_TIME} />
          <PriestCard />
        </div>
        <ChurchesCard />
        <SupportCard />
        <SocialCard className="md:col-span-2 lg:col-span-1" />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(parishJsonLd(`${SITE_URL}${links.contacts}`, pragueDate(BUILD_TIME))),
        }}
      />
    </PageShell>
  );
}
