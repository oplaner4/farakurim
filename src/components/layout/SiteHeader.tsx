import { clsx } from "clsx";
import { serviceSheet } from "@/content/ohlasky";
import { links, mainNav } from "@/content/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ColorStripe } from "@/components/ui/ColorStripe";
import { FileDownloadIcon } from "@/components/ui/icons";
import { HeaderMenu } from "./HeaderMenu";
import { MenuButton } from "./MenuButton";
import { NavGroupAccordions } from "./NavGroupAccordions";
import { NavGroupColumns } from "./NavGroupColumns";
import type { SectionColor } from "@/components/ui/SectionHeading";
import { ThemeToggle } from "./ThemeToggle";

const MENU_ID = "vice-menu";
const MENU_BUTTON_ID = "menu-tlacitko";
const MORE_BUTTON_ID = "vice-tlacitko";

/** The current page's item takes its section's tint and ink (design/DESIGN.md §11.1). */
const currentStyles: Record<SectionColor, { desktop: string; menu: string }> = {
  blue: {
    desktop: "aria-[current=page]:bg-blue-tint aria-[current=page]:text-blue-ink",
    menu: "aria-[current=page]:text-blue-ink md:aria-[current=page]:bg-blue-tint",
  },
  green: {
    desktop: "aria-[current=page]:bg-green-tint aria-[current=page]:text-green-ink",
    menu: "aria-[current=page]:text-green-ink md:aria-[current=page]:bg-green-tint",
  },
  magenta: {
    desktop: "aria-[current=page]:bg-magenta-tint aria-[current=page]:text-magenta-ink",
    menu: "aria-[current=page]:text-magenta-ink md:aria-[current=page]:bg-magenta-tint",
  },
  orange: {
    desktop: "aria-[current=page]:bg-orange-tint aria-[current=page]:text-orange-ink",
    menu: "aria-[current=page]:text-orange-ink md:aria-[current=page]:bg-orange-tint",
  },
};

/**
 * `currentHref` marks the main menu item of the page's section; `pageHref` the page itself among the "Více" groups
 * (an archive page is under "Aktuality" or "Petrklíč" but is its own link there).
 */
export function SiteHeader({
  currentHref = links.home,
  pageHref = currentHref,
}: {
  currentHref?: string;
  pageHref?: string;
}) {
  const navItems = mainNav.map((item) => ({ ...item, current: item.href === currentHref }));

  return (
    <HeaderMenu className="group/header relative flex flex-col bg-bg">
      <div className="container-page flex items-center justify-between gap-3 py-3 md:gap-4 md:py-4 lg:flex-wrap lg:gap-x-8 lg:py-4.5">
        <a href={links.home} className="flex items-center gap-3 text-ink no-underline hover:text-ink md:gap-3.5">
          <img
            src="/assets/img/logo-farnost-kurim.svg"
            alt=""
            width={421}
            height={681}
            className="h-12 w-7.5 md:h-13.75 md:w-8.5 lg:h-14.5 lg:w-9"
          />
          <span className="flex flex-col leading-title">
            <span className="text-12 text-muted md:text-14">Římskokatolická farnost</span>
            <span className="text-22 font-bold tracking-heading md:text-26 lg:text-28">Kuřim</span>
          </span>
        </a>

        <div className="flex items-center gap-2 md:gap-3 lg:gap-2">
          <nav aria-label="Hlavní menu" className="hidden lg:mr-2 lg:block">
            <ul className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    className={clsx(
                      "flex min-h-11 items-center rounded-12 px-3 text-ink no-underline hover:bg-surface hover:text-ink aria-[current=page]:font-bold",
                      currentStyles[item.color].desktop,
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <MenuButton id={MORE_BUTTON_ID} controls={MENU_ID} variant="more" />
              </li>
            </ul>
          </nav>
          <ButtonLink href={serviceSheet.pdfUrl} size="compact" className="max-md:hidden">
            <FileDownloadIcon size={18} />
            Ohlášky
          </ButtonLink>
          <ThemeToggle />
          <MenuButton id={MENU_BUTTON_ID} controls={MENU_ID} variant="hamburger" />
        </div>
      </div>

      <ColorStripe />

      {/* Shown while a menu button is expanded. Mobile: the main items as a list, then the groups as accordions.
          Tablet: main items as a 3-column grid of tiles, then the groups in 4 columns. Desktop: only the groups,
          in a panel over the page (the main items are inline above). With motion allowed it fades in sliding down
          8px and fades out the same way (a discrete `display` transition; the `starting:` styles sit on the open state,
          which would outrank them otherwise). */}
      <div
        id={MENU_ID}
        className="hidden border-b border-line bg-bg opacity-0 group-has-aria-expanded/header:block group-has-aria-expanded/header:opacity-100 motion-safe:-translate-y-2 motion-safe:transition-[opacity,translate,display] motion-safe:transition-discrete motion-safe:duration-200 motion-safe:ease-out motion-safe:group-has-aria-expanded/header:translate-y-0 lg:absolute lg:inset-x-0 lg:top-full lg:z-40 lg:shadow-menu motion-safe:starting:group-has-aria-expanded/header:-translate-y-2 motion-safe:starting:group-has-aria-expanded/header:opacity-0"
      >
        <div className="container-page pt-2 pb-4 md:py-4 lg:pt-7 lg:pb-9">
          <nav aria-label="Hlavní menu" className="lg:hidden">
            <ul className="flex flex-col md:grid md:grid-cols-3 md:gap-2">
              {navItems.map((item) => (
                <li key={item.label} className="border-line-soft max-md:not-first:border-t">
                  <a
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    className={clsx(
                      "block px-1 py-3 text-18 text-ink no-underline hover:text-blue-ink aria-[current=page]:font-bold md:flex md:min-h-12 md:items-center md:rounded-12 md:bg-surface md:px-4 md:py-0 md:text-17 md:hover:bg-blue-tint",
                      currentStyles[item.color].menu,
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav
            aria-label="Další stránky"
            className="mt-4 md:mt-5 md:border-t md:border-line md:pt-5 lg:mt-0 lg:border-t-0 lg:pt-0"
          >
            <NavGroupAccordions label="Další stránky" currentHref={pageHref} className="md:hidden" />
            <NavGroupColumns place="menu" currentHref={pageHref} className="max-md:hidden" />
          </nav>
        </div>
      </div>
      <noscript>
        <style>{`#${MORE_BUTTON_ID}{display:none}@media (max-width:74.99rem){#${MENU_ID}{display:block}#${MENU_BUTTON_ID}{display:none}}`}</style>
      </noscript>
    </HeaderMenu>
  );
}
