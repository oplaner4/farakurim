import type { Metadata } from "next";
import { CampPageHeading } from "@/components/camp/CampPageHeading";
import { TeamLightbox } from "@/components/camp/TeamLightbox";
import { TeamSection } from "@/components/camp/TeamSection";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LinkCard } from "@/components/ui/LinkCard";
import { campTeam } from "@/content/camp";
import { links } from "@/content/site";
import { membersWithPhotos, photoCaption, teamGroups } from "@/lib/camp/team";

const lead = `Tým tábora ${campTeam.year}: kdo se o děti stará, připravuje program a vede hry.`;

export const metadata: Metadata = {
  title: "Vedoucí tábora",
  alternates: { canonical: links.campTeam },
  description: `${lead} Hlavní vedoucí, zdravotnice, vedoucí a praktikanti farního tábora.`,
};

const groups = teamGroups(campTeam.members);
const withPhotos = membersWithPhotos(groups);
/** Each photo's place in the lightbox ("#foto-N"). */
const photoNumbers = new Map(withPhotos.map((member, i) => [member, i + 1]));

/** Tábor – Vedoucí (design/DESIGN.md §29.3): the year's team in three groups; a photo opens the team lightbox. */
export default function CampTeamPage() {
  return (
    <>
      <SiteHeader currentHref={links.campTeam} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <CampPageHeading page="Vedoucí" intro={lead} />
        {groups.map((group) => (
          <TeamSection key={group.id} group={group} photoNumbers={photoNumbers} />
        ))}
        <LinkCard
          href={links.campContact}
          title="Máte dotaz k táboru?"
          text="Napište nebo zavolejte kontaktním osobám."
          tone="magenta"
        />
        <TeamLightbox
          title={`Tým tábora ${campTeam.year}`}
          photos={withPhotos.flatMap((m) => (m.photo ? [m.photo] : []))}
          labels={withPhotos.map((m) => ({ title: m.name, caption: photoCaption(m), short: m.role }))}
        />
      </main>
    </>
  );
}
