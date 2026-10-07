import { BUILD_YEAR, links } from "./site";
import type { PlannedPage } from "./types/planned";

/*
 * The old site's pages (farakurim.cz/sitemap) that are not rebuilt yet: each URL gets a page with "Stránku
 * připravujeme", so nothing 404s once the new site takes over farakurim.cz. The extra catechesis pages move under
 * Katecheze pro děti in Seznam aktivit; public/.htaccess redirects their old URLs. When a page is rebuilt, remove it
 * here.
 */

const activities = { label: "Seznam aktivit", href: links.activities };

const camp = { label: "Farní tábor", href: "/farni_tabor/informace/" };
const campPages: PlannedPage[] = [
  { path: "/farni_tabor/informace/", title: "Farní tábor", color: "magenta" },
  { path: "/farni_tabor/vedouci/", title: "Vedoucí", color: "magenta", parents: [camp] },
  { path: "/farni_tabor/kontakt/", title: "Kontakt", color: "magenta", parents: [camp] },
  { path: "/farni_tabor/rocniky/", title: "Ročníky", color: "magenta", parents: [camp] },
  // From the first camp on the old site to the build year ("Tábor <year>" in the menu).
  ...Array.from({ length: BUILD_YEAR - 2018 }, (_, i) => 2019 + i).map((year): PlannedPage => ({
    path: `/farni_tabor/${year}/`,
    title: `Tábor ${year}`,
    color: "magenta",
    parents: [camp, { label: "Ročníky", href: "/farni_tabor/rocniky/" }],
  })),
];

const nativity = { label: "Betlémy", href: "/betlemy/rozcestnik/" };
const nativityPages: PlannedPage[] = [
  { path: "/betlemy/rozcestnik/", title: "Betlémy", color: "green" },
  { path: "/betlemy/vystava/", title: "Výstava betlémů", color: "green", parents: [nativity] },
  { path: "/betlemy/putovani/", title: "Betlémské putování", color: "green", parents: [nativity] },
  { path: "/betlemy/2024/", title: "Betlémy 2024", color: "green", parents: [nativity] },
  { path: "/betlemy/2025/", title: "Betlémy 2025", color: "green", parents: [nativity] },
];

const KATECHEZE = links.catechesis;
const catechesis = { label: "Katecheze pro děti", href: KATECHEZE };
const extra = { label: "Mimořádné katecheze", href: `${KATECHEZE}mimoradne/rozcestnik/` };

/** A season of the extra catechesis: its signpost and one page per Sunday. */
function season(slug: string, name: string, sundays: number): PlannedPage[] {
  const signpost = { label: name, href: `${KATECHEZE}mimoradne/${slug}/rozcestnik/` };
  return [
    { path: signpost.href, title: name, color: "green", parents: [activities, catechesis, extra] },
    ...Array.from({ length: sundays }, (_, i): PlannedPage => ({
      path: `${KATECHEZE}mimoradne/${slug}/${i + 1}/`,
      title: `${i + 1}. neděle`,
      color: "green",
      parents: [activities, catechesis, extra, signpost],
    })),
  ];
}

const activityPages: PlannedPage[] = [
  { path: extra.href, title: "Mimořádné katecheze", color: "green", parents: [activities, catechesis] },
  ...season("adventni_doba", "Adventní doba", 4),
  {
    path: `${KATECHEZE}mimoradne/vanocni_doba/rozcestnik/`,
    title: "Vánoční doba",
    color: "green",
    parents: [activities, catechesis, extra],
  },
  ...[
    ["stedry_den", "Štědrý den"],
    ["tri_kralove", "Tři králové"],
  ].map(([slug, title]): PlannedPage => ({
    path: `${KATECHEZE}mimoradne/vanocni_doba/${slug}/`,
    title,
    color: "green",
    parents: [
      activities,
      catechesis,
      extra,
      { label: "Vánoční doba", href: `${KATECHEZE}mimoradne/vanocni_doba/rozcestnik/` },
    ],
  })),
  ...season("postni_doba", "Postní doba", 6),
  {
    path: `${KATECHEZE}mimoradne/svaty_tyden/`,
    title: "Svatý týden",
    color: "green",
    parents: [activities, catechesis, extra],
  },
  {
    path: `${KATECHEZE}mimoradne/seslani_ducha_svateho/`,
    title: "Slavnost seslání Ducha svatého",
    color: "green",
    parents: [activities, catechesis, extra],
  },
];

export const plannedPages: PlannedPage[] = [...activityPages, ...campPages, ...nativityPages];
