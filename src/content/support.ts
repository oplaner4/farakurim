import type { SupportPage } from "./types/support";

/*
 * Finanční podpora (design/DESIGN.md §22): the projects of the year and the other ways to give, as on the old site's
 * /financni_podpora/aktualne. Amounts are whole Kč, valid on `asOf`; update them with each statement.
 */
export const support: SupportPage = {
  year: 2026,
  asOf: "2026-09-30",
  projects: [
    {
      id: "fara",
      title: "Budova fary v Kuřimi",
      place: { name: "Kuřim", color: "blue" },
      description:
        "Ošetření krovu palánku proti škůdcům, oprava a nátěr jeho fasády, nátěr fasády stodoly a oprava plotů za farou.",
      variableSymbol: "5555",
      budget: 664679,
      grants: 0,
      gifts: 120800,
      workDone: 441710,
    },
    {
      id: "kninice",
      title: "Kostel sv. Markéty v Moravských Knínicích",
      place: { name: "Moravské Knínice", color: "green" },
      description: "Vybudování sociálního zařízení (WC), nejprve příprava projektové dokumentace.",
      variableSymbol: "4444",
      budget: 280000,
      grants: 0,
      gifts: 51800,
    },
    {
      id: "kostel",
      title: "Kostel sv. Maří Magdaleny v Kuřimi",
      place: { name: "Kuřim", color: "blue" },
      description:
        "Provozní údržba kostela a projektová příprava dalších oprav (okapy, římsy, okna, dveře, fasáda, odvlhčení, statika).",
      variableSymbol: "3333",
      budget: 330000,
      grants: 0,
      gifts: 5500,
      workDone: 16940,
    },
  ],
  regularGifts: { variableSymbol: "1111", received: 130540 },
  puls: [
    { year: 2015, assessed: 52318, fromDonors: null, fromCollections: 52318 },
    { year: 2016, assessed: 69160, fromDonors: null, fromCollections: 69160 },
    { year: 2017, assessed: 76232, fromDonors: 1500, fromCollections: 74732 },
    { year: 2018, assessed: 74076, fromDonors: 19390, fromCollections: 54686 },
    { year: 2019, assessed: 74258, fromDonors: 24525, fromCollections: 49733 },
    { year: 2020, assessed: 127293, fromDonors: 37680, fromCollections: 89613 },
    { year: 2021, assessed: 120735, fromDonors: 51825, fromCollections: 68910 },
    { year: 2022, assessed: 122853, fromDonors: 122853, fromCollections: 0 },
    { year: 2023, assessed: 125092, fromDonors: 125092, fromCollections: 0 },
    { year: 2024, assessed: 131889, fromDonors: 131889, fromCollections: 0 },
    { year: 2025, assessed: 174740, fromDonors: 174740, fromCollections: 0 },
    { year: 2026, assessed: 169799, fromDonors: null, fromCollections: null },
  ],
  pulsUrl: "https://donator.cz/",
  pastoralUrl: "https://donator.cz/projekt/tisnovpastorace",
};
