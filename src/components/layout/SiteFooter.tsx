import { Fragment } from "react";
import { BUILD_YEAR, contacts, links, parish } from "@/content/site";
import { NEW_TAB } from "@/lib/links";
import { ColorStripe } from "@/components/ui/ColorStripe";
import { NavGroupAccordions } from "./NavGroupAccordions";
import { NavGroupColumns } from "./NavGroupColumns";

/** Sitemap footer on every page (design/DESIGN.md §20.3): the parish block and the "Více" groups. */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface">
      <ColorStripe />
      <div className="container-page flex flex-col gap-6 pt-8 pb-5 md:gap-8 md:pt-9 md:pb-7 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,3.75fr)] lg:gap-12 lg:pt-11 lg:pb-8">
        <div className="flex min-w-0 flex-col gap-2.5 text-14 text-ink-2">
          <div className="flex items-center gap-3 text-16 text-ink md:text-17">
            <img src="/assets/img/logo-farnost-kurim.svg" alt="" width={421} height={681} className="h-10 w-6.25" />
            <span className="leading-card font-bold">{parish.name}</span>
          </div>
          <span>
            {contacts.street}, {contacts.postalCode} {contacts.town}
          </span>
          <span>
            Obce farnosti:{" "}
            {parish.villages.map((village, i) => (
              <Fragment key={village.name}>
                {i > 0 && " · "}
                <a href={village.href} className="text-inherit hover:text-inherit" {...NEW_TAB}>
                  {village.name}
                </a>
              </Fragment>
            ))}
          </span>
          <span>Bankovní účet: {parish.bankAccount}</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 font-bold">
            <a href={links.virtualTour}>Virtuální prohlídka kostela</a>
            <a href={links.viraCz} {...NEW_TAB}>
              Vira.cz
            </a>
          </span>
        </div>
        <nav aria-label="Mapa webu">
          <NavGroupAccordions className="md:hidden" />
          <NavGroupColumns place="footer" className="max-md:hidden" />
        </nav>
      </div>
      <div className="container-page flex flex-wrap justify-between gap-x-6 gap-y-1.5 pb-8 text-13 text-muted lg:pb-9">
        <span>
          © {BUILD_YEAR} {parish.name}
        </span>
        <a href={links.contacts} className="text-inherit hover:text-inherit">
          Kontakty a úřední hodiny
        </a>
      </div>
    </footer>
  );
}
