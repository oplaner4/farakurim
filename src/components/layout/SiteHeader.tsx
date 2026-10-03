import { clsx } from "clsx";
import { serviceSheet } from "@/content/masses";
import { links, mainNav } from "@/content/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ColorStripe } from "@/components/ui/ColorStripe";
import { FileDownloadIcon } from "@/components/ui/icons";
import { MenuButton } from "./MenuButton";
import type { SectionColor } from "@/components/ui/SectionHeading";
import { ThemeToggle } from "./ThemeToggle";

const MENU_ID = "mobilni-menu";
const MENU_BUTTON_ID = "mobilni-menu-tlacitko";

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

export function SiteHeader({ currentHref = links.home }: { currentHref?: string }) {
  const navItems = mainNav.map((item) => ({ ...item, current: item.href === currentHref }));

  return (
    <header className="group/header flex flex-col bg-bg">
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
            </ul>
          </nav>
          <ButtonLink href={serviceSheet.pdfUrl} size="compact" className="max-md:hidden">
            <FileDownloadIcon size={18} />
            Ohlášky
          </ButtonLink>
          <ThemeToggle />
          <MenuButton id={MENU_BUTTON_ID} controls={MENU_ID} />
        </div>
      </div>

      <ColorStripe />

      {/* Mobile: vertical list. Tablet: 3-column grid of pills. Desktop uses the inline nav above.
          Shown while the menu button is expanded. */}
      <nav
        id={MENU_ID}
        aria-label="Hlavní menu"
        className="hidden border-b border-line max-lg:group-has-aria-expanded/header:block"
      >
        <ul className="container-page flex flex-col pt-2 pb-4 md:grid md:grid-cols-3 md:gap-2 md:py-4">
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
      <noscript>
        <style>{`@media (max-width:74.99rem){#${MENU_ID}{display:block}#${MENU_BUTTON_ID}{display:none}}`}</style>
      </noscript>
    </header>
  );
}
