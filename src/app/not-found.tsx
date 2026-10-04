import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHeading } from "@/components/ui/PageHeading";
import { links } from "@/content/site";

export const metadata: Metadata = {
  title: "Stránka nenalezena",
  robots: { index: false },
};

/*
 * The static export writes this page to out/404.html; public/.htaccess serves it for every missing URL. No mockup
 * yet: the standard page heading plus links back to the main pages.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader currentHref="" />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading
          title="Stránka nenalezena"
          crumb="Chyba 404"
          color="blue"
          size="standard"
          intro="Tato stránka neexistuje nebo byla přesunuta. Zkuste začít na úvodní stránce."
        />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={links.home}>Úvodní stránka</ButtonLink>
          <ButtonLink href={links.news} variant="outline">
            Aktuality
          </ButtonLink>
          <ButtonLink href={links.services} variant="outline">
            Pořad bohoslužeb
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
