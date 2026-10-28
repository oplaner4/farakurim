import { clsx } from "clsx";
import type { ReactNode } from "react";
import { serviceSheets } from "@/server/service-sheets";
import { CurrentSheet } from "@/components/services/CurrentSheet";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { links, mainNav } from "@/content/site";
import { seasonalNavItems, seasonalNavPeriods } from "@/server/seasonal-nav";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ColorStripe } from "@/components/ui/ColorStripe";
import { TentIcon } from "@/components/ui/icons/camp-icons";
import { FileDownloadIcon } from "@/components/ui/icons/media-icons";
import { NativityStarIcon } from "@/components/ui/icons/nativity-icons";
import { HeaderMenu } from "./HeaderMenu";
import { MenuButton } from "./MenuButton";
import { NavGroupAccordions } from "./NavGroupAccordions";
import { NavGroupColumns } from "./NavGroupColumns";
import { SeasonalNavItem } from "./SeasonalNavItem";
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

type NavItem = { label: string; href: string; color: SectionColor };
type NavPlace = "desktop" | "menu";

const navLinkStyles: Record<NavPlace, string> = {
  desktop:
    "flex min-h-11 items-center gap-1.5 rounded-12 px-3 text-ink no-underline hover:bg-surface hover:text-ink aria-[current=page]:font-bold",
  menu: "flex items-center gap-2 px-1 py-3 text-18 text-ink no-underline hover:text-blue-ink aria-[current=page]:font-bold md:min-h-12 md:rounded-12 md:bg-surface md:px-4 md:py-0 md:text-17 md:hover:bg-blue-tint",
};

/** The seasonal items' icons: only the icon carries the section colour (design/DESIGN.md §4.1a). */
const seasonalIcons = {
  nativity: <NativityStarIcon size={16} className="flex-none text-orange-ink" />,
  camp: <TentIcon size={16} className="flex-none text-magenta-ink" />,
};

function NavLink({
  item,
  place,
  currentHref,
  icon,
}: {
  item: NavItem;
  place: NavPlace;
  currentHref: string;
  icon?: ReactNode;
}) {
  return (
    <a
      href={item.href}
      aria-current={item.href === currentHref ? "page" : undefined}
      className={clsx(navLinkStyles[place], currentStyles[item.color][place])}
    >
      {icon}
      {item.label}
    </a>
  );
}

/** A main-menu item; Petrklíč's place shows the seasonal item of the visitor's date. */
function MainNavItem({ item, place, currentHref }: { item: NavItem; place: NavPlace; currentHref: string }) {
  if (item.href !== links.petrklic) return <NavLink item={item} place={place} currentHref={currentHref} />;
  return (
    <SeasonalNavItem
      periods={seasonalNavPeriods}
      renderedAt={BUILD_TIME}
      items={{
        petrklic: <NavLink item={item} place={place} currentHref={currentHref} />,
        nativity: (
          <NavLink
            item={seasonalNavItems.nativity}
            place={place}
            currentHref={currentHref}
            icon={seasonalIcons.nativity}
          />
        ),
        camp: (
          <NavLink item={seasonalNavItems.camp} place={place} currentHref={currentHref} icon={seasonalIcons.camp} />
        ),
      }}
    />
  );
}

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
              {mainNav.map((item) => (
                <li key={item.label}>
                  <MainNavItem item={item} place="desktop" currentHref={currentHref} />
                </li>
              ))}
              <li>
                <MenuButton id={MORE_BUTTON_ID} controls={MENU_ID} variant="more" />
              </li>
            </ul>
          </nav>
          <CurrentSheet
            renderedAt={BUILD_TIME}
            items={serviceSheets.map((sheet) => ({
              validFrom: sheet.validFrom,
              node: (
                <ButtonLink href={sheet.pdfUrl} size="compact" className="max-md:hidden">
                  <FileDownloadIcon size={18} />
                  Ohlášky
                </ButtonLink>
              ),
            }))}
          />
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
              {mainNav.map((item) => (
                <li key={item.label} className="border-line-soft max-md:not-first:border-t">
                  <MainNavItem item={item} place="menu" currentHref={currentHref} />
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
