import { parish } from "./site";
import type { LinkGroup } from "./types/links";

/** Odkazy (design/DESIGN.md §23), regrouped from the old site's /odkazy. */
export const linkGroups: LinkGroup[] = [
  {
    id: "cirkev",
    title: "Církev",
    color: "blue",
    links: [
      {
        name: "Česká biskupská konference",
        description: "Stránky katolické církve v Česku",
        href: "https://www.cirkev.cz/",
      },
      {
        name: "Biskupství brněnské",
        description: "Naše diecéze: zprávy, akce, kontakty",
        href: "https://www.biskupstvi.cz/",
      },
      {
        name: "Vatican News",
        description: "Česká sekce vatikánského rozhlasu",
        href: "https://www.vaticannews.va/cs.html",
      },
      { name: "Papežská misijní díla", description: "Podpora misií ve světě", href: "https://www.misijnidila.cz/" },
    ],
  },
  {
    id: "media",
    title: "Média",
    color: "magenta",
    links: [
      { name: "Katolický týdeník", description: "Zprávy z církve každý týden", href: "https://www.katyd.cz/" },
      { name: "Radio Proglas", description: "Křesťanské rádio", href: "https://www.proglas.cz/" },
      { name: "Signály", description: "Na jedné vlně", href: "https://www.signaly.cz/" },
      { name: "Katolik.cz", description: "Katolický internetový portál", href: "https://www.katolik.cz/" },
    ],
  },
  {
    id: "modlitba",
    title: "Modlitba a Bible",
    color: "green",
    links: [
      { name: "Breviář", description: "Denní modlitba církve", href: "https://www.ebreviar.cz/" },
      { name: "Bible on-line", description: "Písmo svaté na internetu", href: "https://www.biblenet.cz/" },
      { name: "Katechismus", description: "Katechismus katolické církve", href: "https://www.katechismus.cz/" },
    ],
  },
  {
    id: "obce",
    title: "Obce farnosti",
    color: "orange",
    // The footer lists the same villages.
    links: parish.villages,
  },
];
