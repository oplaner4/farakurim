import type { Metadata } from "next";
import type { PlannedPage } from "@/content/types/planned";
import { PageHeading } from "@/components/ui/PageHeading";
import { SiteHeader } from "./SiteHeader";

/** A placeholder is kept out of search results until its page is rebuilt. */
export const plannedPageMetadata = (page: PlannedPage | undefined): Metadata =>
  page ? { title: page.title, robots: { index: false } } : {};

/** An old-site page not rebuilt yet (`content/planned-pages.ts`): its breadcrumb, title and "Stránku připravujeme". */
export function PlannedPageView({ page }: { page: PlannedPage }) {
  return (
    <>
      <SiteHeader currentHref={page.path} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title={page.title} color={page.color} size="standard" parents={page.parents} />
        <p className="text-17 text-ink-2 md:text-18">Stránku připravujeme.</p>
      </main>
    </>
  );
}
