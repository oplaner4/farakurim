import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

/**
 * A page of one column: the header marking `currentHref` and `<main id="obsah">` with the standard spacing between
 * its blocks and around them.
 */
export function PageShell({ currentHref, children }: { currentHref: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader currentHref={currentHref} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        {children}
      </main>
    </>
  );
}
