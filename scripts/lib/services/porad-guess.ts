// First guesses for a pořad bohoslužeb draft, to check with the user: a service row's mass and service flags, and an
// announcement's category.

import type { AnnouncementCategory, SheetRow } from "@/content/types/services";

/**
 * The mass and service flags of a service row from its title ("Mše sv.") and its whole line ("Mše sv. – za …"), in any
 * place, as the website counts only the parish churches' services.
 */
export function serviceFlags(title: string, line: string): Pick<SheetRow, "mass" | "service"> {
  // "Mše sv.", "Hodová mše sv.", "Slavnostní mše k jubileu", a funeral mass too, and a vigil ("Velikonoční vigilie").
  const mass = /mše|vigilie/i.test(title);
  // A mass-like public service: adoration, prayers, novenas ("Prvopáteční adorace", "Svatodušní novéna") and devotions
  // ("Májová pobožnost"), any "bohoslužba", the Easter rites ("Velkopáteční obřady").
  // Personal events (funerals, weddings), confessions and the Way of the Cross are left to the user.
  const service = !mass && (/(^|\s)(adorace|modlit|novéna)|obřady/i.test(title) || /bohoslužb|pobožnost/i.test(line));
  return { ...(mass && { mass }), ...(service && { service }) };
}

/** A first guess at an announcement's category from its words; `info` when nothing fits. */
const CATEGORY_HINTS: [AnnouncementCategory, RegExp][] = [
  ["smireni", /zpovídá|zpově|svátost smíření/i],
  ["zmena", /nebude|zrušen|přesouvá|přeložen|místo obvykl|změn[ayě] v/i],
  ["podekovani", /děkuj|poděkování/i],
  ["pozvanka", /zve(me)?\b|pozvání|srdečně|přihlá|pouť|koncert/i],
];
export const guessCategory = (text: string) => CATEGORY_HINTS.find(([, hint]) => hint.test(text))?.[0] ?? "info";
