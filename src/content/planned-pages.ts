import type { PlannedPage } from "./types/planned";

/*
 * The old site's pages (farakurim.cz/sitemap) that are not rebuilt yet: each URL gets a page with "Stránku
 * připravujeme", so nothing 404s once the new site takes over farakurim.cz. When a page is rebuilt, remove it here.
 * The extra catechesis (Mimořádné katecheze), Tábor 2019–2026 and Betlémy 2024 and 2025 are not rebuilt: they stay
 * on stary.farakurim.cz, where public/.htaccess redirects their URLs.
 */

const camp = { label: "Farní tábor", href: "/farni_tabor/informace/" };
const campPages: PlannedPage[] = [
  { path: "/farni_tabor/informace/", title: "Farní tábor", color: "magenta" },
  { path: "/farni_tabor/vedouci/", title: "Vedoucí", color: "magenta", parents: [camp] },
  { path: "/farni_tabor/kontakt/", title: "Kontakt", color: "magenta", parents: [camp] },
  { path: "/farni_tabor/rocniky/", title: "Ročníky", color: "magenta", parents: [camp] },
];

const nativity = { label: "Betlémy", href: "/betlemy/rozcestnik/" };
const nativityPages: PlannedPage[] = [
  { path: "/betlemy/rozcestnik/", title: "Betlémy", color: "green" },
  { path: "/betlemy/vystava/", title: "Výstava betlémů", color: "green", parents: [nativity] },
  { path: "/betlemy/putovani/", title: "Betlémské putování", color: "green", parents: [nativity] },
];

export const plannedPages: PlannedPage[] = [...campPages, ...nativityPages];
