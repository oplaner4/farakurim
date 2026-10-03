"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { serviceSheet } from "@/content/masses";
import { links, mainNav } from "@/content/site";
import { ColorStripe } from "./ColorStripe";
import { CloseIcon, FileDownloadIcon, MenuIcon } from "./icons";

const MENU_ID = "mobilni-menu";
const MENU_BUTTON_ID = "mobilni-menu-tlacitko";

export function SiteHeader({ currentHref = links.home }: { currentHref?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const navItems = mainNav.map((item) => ({ ...item, current: item.href === currentHref }));

  return (
    <header className="flex flex-col bg-white">
      <div className="container-page flex items-center justify-between gap-3 py-3 md:gap-4 md:py-4 lg:flex-wrap lg:gap-x-8 lg:py-4.5">
        <a href={links.home} className="flex items-center gap-3 text-ink no-underline hover:text-ink md:gap-3.5">
          <img
            src="/assets/img/logo-farnost-kurim.svg"
            alt=""
            width={421}
            height={681}
            className="h-12 w-7.5 md:h-13.75 md:w-8.5 lg:h-14.5 lg:w-9"
          />
          <span className="flex flex-col leading-[1.15]">
            <span className="text-12 text-muted md:text-14">Římskokatolická farnost</span>
            <span className="text-22 font-bold tracking-heading md:text-26 lg:text-28">Kuřim</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          <nav aria-label="Hlavní menu" className="hidden lg:block">
            <ul className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    className="flex min-h-11 items-center rounded-12 px-3.5 text-ink no-underline hover:bg-surface hover:text-ink aria-[current=page]:bg-blue-tint aria-[current=page]:font-bold aria-[current=page]:text-blue-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={serviceSheet.pdfUrl}
            className="hidden min-h-12 items-center gap-2 rounded-14 bg-blue px-4.5 font-bold whitespace-nowrap text-white no-underline hover:bg-blue-ink hover:text-white md:flex lg:px-5"
          >
            <FileDownloadIcon size={18} />
            Pořad bohoslužeb
          </a>
          <button
            id={MENU_BUTTON_ID}
            type="button"
            className="flex size-12 cursor-pointer items-center justify-center rounded-14 bg-blue-tint text-blue-ink hover:bg-blue-tint-alt lg:hidden"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? "Zavřít menu" : "Otevřít menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      <ColorStripe />

      {/* Mobile: vertical list. Tablet: 3-column grid of pills. Desktop uses the inline nav above. */}
      <nav
        id={MENU_ID}
        aria-label="Hlavní menu"
        className={clsx("border-b border-line lg:hidden", open ? "block" : "hidden")}
      >
        <ul className="container-page flex flex-col pt-2 pb-4 md:grid md:grid-cols-3 md:gap-2 md:py-4">
          {navItems.map((item) => (
            <li key={item.label} className="border-line-soft max-md:not-first:border-t">
              <a
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className="block px-1 py-3 text-18 text-ink no-underline hover:text-blue-ink aria-[current=page]:font-bold aria-[current=page]:text-blue-ink md:flex md:min-h-12 md:items-center md:rounded-12 md:bg-surface md:px-4 md:py-0 md:text-17 md:hover:bg-blue-tint md:aria-[current=page]:bg-blue-tint"
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
