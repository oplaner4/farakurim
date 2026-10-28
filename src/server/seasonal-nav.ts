import "server-only";
import { nextCamp } from "@/content/camp";
import { nativitySeasons } from "@/content/nativity";
import { seasonalNav } from "@/content/site";
import { seasonalPeriods } from "@/lib/layout/seasonal-nav";

// The seasonal main-menu item (design/DESIGN.md §4.1a), from the exhibition's opening days and the next camp's dates.

/** When Betlémy or Tábor takes Petrklíč's place; the header picks the item for the visitor's date. */
export const seasonalNavPeriods = seasonalPeriods(nativitySeasons, nextCamp);

/** The seasonal items, Tábor leading to the next camp's page once it exists. */
export const seasonalNavItems = {
  nativity: seasonalNav.nativity,
  camp: { ...seasonalNav.camp, href: nextCamp.href ?? seasonalNav.camp.href },
};
