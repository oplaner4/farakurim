import { contacts, links } from "./site";
import type { GroupLink, GroupPage } from "./types/activities";

/*
 * The group pages (design/DESIGN.md §27), served at /aktivity/<id>/ by src/app/aktivity/[skupina]/. Schola is
 * rebuilt from the old site's /schola; the other groups still link there until they get their page: add a
 * GroupPage to `groupPages` with `href: /aktivity/<id>/` (and its link in site.ts `navGroups`).
 * Photos and video thumbnails are uploaded to /uploads/skupiny/<group>/.
 */

const UPLOADS = "/uploads/skupiny/schola";

const photo = (n: number) => ({ small: `${UPLOADS}/foto-${n}-nahled.webp`, large: `${UPLOADS}/foto-${n}.webp` });

export const schola: GroupPage = {
  id: "schola",
  name: "Schola",
  note: "1× měsíčně při dětské mši",
  href: links.schola,
  tagline: "Jsme parta dětí, mladých i dospělých, které spojuje radost ze zpěvu, hudby a společného prožívání víry.",
  description:
    "Jsme parta dětí, mladých i dospělých, které spojuje radost ze zpěvu, hudby a společného prožívání víry. Zpíváme při dětských mších v Kuřimi; přidat se může každý, kdo rád zpívá nebo hraje.",
  hero: {
    src: `${UPLOADS}/schola-uvod.webp`,
    small: `${UPLOADS}/schola-uvod-nahled.webp`,
    alt: "Schola s hudebními nástroji na zahradě pod stromy",
  },
  about: [
    "Doprovázíme především dětské bohoslužby v Kuřimi, ale zpíváme také při slavnostních příležitostech, jako jsou Vánoce, první svaté přijímání, biřmování nebo další farní akce. Občas se k nám připojí také členové chrámového sboru nebo další muzikanti a zpěváci z Kuřimi, za jejichž podporu a spolupráci jsme velmi vděční.",
    "Ve schole nám nejde jen o správné noty. Chceme vytvářet společenství, kde se každý může cítit vítaný, rozvíjet svůj talent a prožívat víru skrze hudbu. Pravidelně se scházíme ke zkouškám a svým zpěvem se snažíme přispívat k tomu, aby bohoslužby byly skutečným společným slavením a modlitbou.",
    "Zpíváme duchovní písničky známé napříč farnostmi a společenstvími. Některé v jednodušší podobě, jiné v aranžích Pavla Rajmice, který píše úpravy i pro Scholu brněnské mládeže.",
    "Scholu v letech 2018–2024 vedly Lenka Psotová a Kateřina Rajmicová, kapelníkem a aranžérem byl Pavel Rajmic. Od roku 2025 scholu vede Lenka Psotová. Nové aranže pro naši scholu v současné době vytváří Dorothea Kytnerová.",
    "Za podporu a vstřícnost děkujeme otci Jaroslavu Filkovi, který nám poskytuje zázemí pro zkoušky jak v samotném kostele, tak i v přednáškovém sále na faře. Za nákup zpěvníků děkujeme kuřimské farnosti a velmi si vážíme také podpory města Kuřimi, díky jehož dotacím bylo pořízeno naše technické vybavení.",
    "Máte chuť si s námi zazpívat nebo zahrát na hudební nástroj? Budeme rádi, když se ozvete a přijdete mezi nás. Dveře máme otevřené všem.",
  ],
  when: [
    { label: "Zpíváme", text: "první neděli v měsíci v 9:30 při dětské mši" },
    { label: "Zkoušíme", text: "dvě neděle před dětskou mší, 17:00–18:30" },
  ],
  where: { name: "Fara Kuřim", address: contacts.street },
  contact: {
    name: "Lenka Psotová",
    role: "vedoucí scholy",
    phone: "775 543 340",
    email: "psotova.lp@seznam.cz",
  },
  photos: Array.from({ length: 19 }, (_, i) => photo(i + 1)),
  videos: [
    {
      youtubeId: "hNIYvlZID14",
      title: "Králi milost nám dej",
      seconds: 142,
      thumbnail: `${UPLOADS}/video-hNIYvlZID14.webp`,
    },
    { youtubeId: "KzSy0MDmCV8", title: "Tvůj plamen", seconds: 178, thumbnail: `${UPLOADS}/video-KzSy0MDmCV8.webp` },
    { youtubeId: "iAToQnAPl94", title: "Zde jsem", seconds: 224, thumbnail: `${UPLOADS}/video-iAToQnAPl94.webp` },
  ],
  channel: { label: "Kanál @ScholaKurim na YouTube", href: "https://www.youtube.com/@ScholaKurim" },
  downloads: {
    title: "Noty a zpěvníky",
    items: [
      { label: "Zpěvníky scholových písniček (Hosana, Koinonia…)", href: "http://schola.wi.cz/index.php" },
      { label: "Regenschori – databáze not, nahrávek a videí", href: "https://regenschori.cz/" },
      {
        label: "Náš repertoár a noty",
        href: "https://drive.google.com/drive/folders/1j-_96ILduwqz3yn7oYsL-ehuJ8khZ08w?usp=sharing",
      },
    ],
  },
};

/** The groups with a page here, one route each. */
export const groupPages: GroupPage[] = [schola];

/** "Další skupiny": every group with a page here or on the old site. */
export const groupLinks: GroupLink[] = [
  schola,
  {
    id: "chramovy-sbor",
    name: "Chrámový sbor",
    note: "sbor pro mše a slavnosti",
    href: `${links.activities}chramovy_sbor/`,
  },
  {
    id: "spolecenstvi-mladeze",
    name: "Společenství mládeže",
    note: "každou neděli 18:30",
    href: `${links.activities}spolecenstvi_mladych/`,
  },
  {
    id: "katecheze",
    name: "Katecheze pro děti",
    note: "každou neděli při 2. mši",
    href: `${links.activities}katecheze_pro_deti/`,
  },
];
