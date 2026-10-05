import type { ChronicleEra } from "./types/chronicle";

/*
 * Kronika farnosti (design/DESIGN.md §26): the old site's /kronika_prehled_udalosti, word for word without the
 * "L. P." before each year, sorted by year (the old page had 1833 and 1843 out of order).
 */
export const chronicle: ChronicleEra[] = [
  {
    id: "13-18-stoleti",
    title: "13.–18. století",
    entries: [
      {
        year: "1226",
        text: "Připomíná se první kostel v Kuřimi v románském slohu. Nechal jej postavit český král Přemysl Otakar I.",
        milestone: true,
      },
      {
        year: "1250",
        text: "Od násilníků odtržený kostel v Kuřimi byl znovu spojen s kostelem sv. Petra a Pavla v Brně markrabětem moravským Přemyslem.",
      },
      { year: "1286", text: "V Kuřimi vznikla samostatná farnost.", milestone: true },
      {
        year: "1537",
        text: "Před hlavním oltářem pohřben Petr Nekeš z Landeku, syn majitele kuřimského statku Sigmunda Nekeše.",
      },
      { year: "1648", text: "Kostel a fara byly vypleněny Švédy." },
      { year: "1680", text: "Památná socha sv. Floriána." },
      { year: "1722", text: "Památná socha sv. Jana Nepomuckého v Podhoří." },
      {
        year: "1766–1772",
        text: "Kostel v Kuřimi znovu vystavěn nákladem vlastního jmění a z odkazu kuřimského faráře P. Františka Adamce (†1765). Kostel je postaven ve slohu rokoko-renesančním. Byl postaven za faráře P. Jana Gandiniho a posvěcen 24. 10. 1772 děkanem brněnským P. Janem Brunnem. Vnitřní zařízení pořízeno za děkana kuřimského P. dr. Josefa Troppeho.",
        milestone: true,
      },
    ],
  },
  {
    id: "19-20-stoleti",
    title: "19.–20. století",
    entries: [
      {
        year: "1833",
        text: "Do tohoto roku býval hřbitov kolem kostela. V době černého moru byli zemřelí pochováváni v místech Malé České (1829, 1832, 1855). Od tohoto roku již nový hřbitov.",
      },
      {
        year: "1843",
        text: "Věž kostela byla pokryta plechem za faráře P. Josefa Chalupy. Byly na ní 4 zvony z roku 1650 a 1673. Za I. světové války byly i přes své stáří zrekvírovány.",
      },
      { year: "1874", text: "Věžní hodiny zakoupeny ve Vídni." },
      {
        year: "1888–1889",
        text: "Generální oprava kostela. 13. 10. 1889 byl kostel znovu konsekrován za děkana P. Františka Mlčocha brněnským biskupem dr. Bauerem.",
      },
      {
        year: "1893",
        text: "Pořízeny nové varhany (2 manuály a 11 rejstříků) od firmy Rieger z Krnova za 1800 zlatých.",
        milestone: true,
      },
      {
        year: "1928–1930",
        text: "V roce 1928 pořízen nový zvon „Umíráček“ (136 kg) a v roce 1930 za děkana P. Josefa Dvořáka 2 zvony (735 kg a 413 kg). I tyto zvony byly vzaty za II. světové války.",
      },
      { year: "1957", text: "Za P. Antonína Uhra, administrátora v Kuřimi, koupen zvon těžký 350 kg." },
      { year: "1971–1972", text: "Generální oprava kostela." },
    ],
  },
  {
    id: "novejsi-opravy",
    title: "Novější opravy",
    entries: [
      { year: "1987–1988", text: "Oprava fasády věže." },
      { year: "1990", text: "Položena nová krytina na lodi kostela." },
      {
        year: "1998",
        text: "V srpnu proběhla unikátní výměna věžní kopule za pomoci těžkotonážního jeřábu a do nově zkonstruované věžní kopule byly instalovány elektronické věžní hodiny.",
      },
      { year: "1998–1999", text: "Statické zajištění kostela." },
      { year: "2000", text: "Nová fasáda kostela.", milestone: true },
      {
        year: "2018",
        text: "Žehnání kaple svatého Dismase a pastorační místnosti ve Věznici Kuřim.",
        link: {
          label: "Více na webu Vězeňské služby",
          href: "https://www.vscr.cz/veznice-kurim/novinky/zehnani-kaple-svateho-dismase-a-pastoracni-mistnosti-ve-veznici-kurim/",
        },
      },
    ],
  },
];
