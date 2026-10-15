import type { Metadata } from "next";
import { CampContactCard } from "@/components/camp/CampContactCard";
import { CampPageHeading } from "@/components/camp/CampPageHeading";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LinkCard } from "@/components/ui/LinkCard";
import { NoticeIcon } from "@/components/ui/icons/status-icons";
import { campContacts } from "@/content/camp";
import { links } from "@/content/site";

const lead = "S jakýmkoli dotazem nebo žádostí k táboru se prosím obracejte pouze na tyto kontaktní osoby.";

export const metadata: Metadata = {
  title: "Kontakt na tábor",
  alternates: { canonical: links.campContact },
  description: `${lead} Telefon a e-mail na vedoucí farního tábora.`,
};

const TONES = ["blue", "green"] as const;

/** Tábor – Kontakt (design/DESIGN.md §29.4): the two contact people, the note for the camp week and Kontakty. */
export default function CampContactPage() {
  return (
    <>
      <SiteHeader currentHref={links.campContact} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <CampPageHeading page="Kontakt" intro={lead} />
        <ul aria-label="Kontaktní osoby" className="grid gap-3.5 md:grid-cols-2">
          {campContacts.people.map((person, i) => (
            <CampContactCard key={person.name} person={person} tone={TONES[i % TONES.length]} />
          ))}
        </ul>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-18 bg-surface px-5 py-4.5">
            <NoticeIcon size={20} className="mt-0.5 flex-none text-magenta-ink" />
            <p className="flex flex-col gap-0.5 text-15 text-ink-2">
              <strong className="text-16 text-ink">Během tábora</strong>
              {campContacts.duringCamp}
            </p>
          </div>
          <LinkCard
            href={links.contacts}
            title="Jiné záležitosti farnosti"
            text="Kontakty na faru a duchovní správu"
            tone="surface"
          />
        </div>
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
