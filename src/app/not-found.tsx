import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
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
    <PageShell currentHref="">
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
    </PageShell>
  );
}
