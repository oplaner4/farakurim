import type { Metadata } from "next";
import { GroupPageView } from "@/components/activities/GroupPageView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { groupLinks, schola } from "@/content/groups";
import { links } from "@/content/site";

export const metadata: Metadata = {
  title: "Schola",
  description: `${schola.tagline} Zpíváme při dětských mších v Kuřimi; přidat se může každý, kdo rád zpívá nebo hraje.`,
};

/** Schola (design/DESIGN.md §27): the first page made from the group template. */
export default function ScholaPage() {
  return (
    <>
      <SiteHeader currentHref={links.schola} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <GroupPageView group={schola} groups={groupLinks} />
      </main>
    </>
  );
}
