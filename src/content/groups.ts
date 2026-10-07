import { contacts, links, OLD_SITE_URL } from "./site";
import type { GroupPage } from "./types/activities";

/*
 * The group pages (design/DESIGN.md §27), served at /aktivity/<id>/ by src/app/aktivity/[skupina]/, rebuilt from
 * the old site's /schola, /chramovy_sbor, /spolecenstvi_mladych/setkavani and /katecheze_pro_deti/pravidelne
 * (public/.htaccess redirects them). Texts the old pages did not have are drafts from the design (§27.1): times,
 * places and contacts are to be confirmed by each group. Photos and video thumbnails are uploaded to
 * /uploads/skupiny/<id>/.
 */

const uploads = (id: string) => `/uploads/skupiny/${id}`;

/** The N-th uploaded photo of a group: `foto-<n>.webp` and its square `foto-<n>-nahled.webp`. */
const photo = (id: string) => (n: number) => ({
  small: `${uploads(id)}/foto-${n}-nahled.webp`,
  large: `${uploads(id)}/foto-${n}.webp`,
});

const UPLOADS = uploads("schola");

export const schola: GroupPage = {
  id: "schola",
  name: "Schola",
  note: "zpíváme na dětských mších",
  href: links.schola,
  tagline: "Jsme parta dětí, mladých i dospělých, které spojuje radost ze zpěvu, hudby a společného prožívání víry.",
  description:
    "Jsme parta dětí, mladých i dospělých, které spojuje radost ze zpěvu, hudby a společného prožívání víry. Zpíváme při dětských mších v Kuřimi; přidat se může každý, kdo rád zpívá nebo hraje.",
  hero: {
    src: `${UPLOADS}/schola-uvod.webp`,
    small: `${UPLOADS}/schola-uvod-nahled.webp`,
    alt: "Schola s hudebními nástroji na zahradě pod stromy",
    focusY: 60,
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
  contacts: [
    {
      name: "Lenka Psotová",
      role: "vedoucí scholy",
      phone: "775 543 340",
      email: "psotova.lp@seznam.cz",
    },
  ],
  photos: Array.from({ length: 19 }, (_, i) => photo("schola")(i + 1)),
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

const CHOIR_FOLDER = "https://1drv.ms/u/s!AjANc2xH5CDegbVfinaEhOQsOmZZzQ?e=CAeNPL";

export const choir: GroupPage = {
  id: "chramovy_sbor",
  name: "Chrámový sbor",
  note: "vícehlasý zpěv při slavnostech",
  href: links.choir,
  tagline: "Zpíváme vícehlasé mše a skladby při slavnostních bohoslužbách v kostele sv. Maří Magdaleny.",
  hero: {
    src: `${uploads("chramovy_sbor")}/chramovy-sbor-uvod.webp`,
    small: `${uploads("chramovy_sbor")}/chramovy-sbor-uvod-nahled.webp`,
    alt: "Chrámový sbor zpívá z not u varhan",
    focusY: 30,
  },
  about: [
    "Sbor zpívá při slavnostních mších – o Vánocích, Velikonocích, na pouť nebo při farních výročích. Repertoár sahá od gregoriánského chorálu po současné autory.",
    "Hledáme nové hlasy, hlavně tenory a basy. Noty číst nemusíte – ke každé skladbě jsou cvičné nahrávky pro jednotlivé hlasy.",
  ],
  when: [
    { label: "Zpíváme", text: "o velkých svátcích a farních slavnostech" },
    { label: "Zkoušíme", text: "před každým vystoupením – termíny posílá sbormistr" },
  ],
  where: { name: "Kostel sv. Maří Magdaleny", address: `zkoušky na faře, ${contacts.street}` },
  contacts: [
    { name: "Adam Janík", role: "sbormistr" },
    { name: "Jan Čáp", role: "varhaník" },
  ],
  // One shared folder: a folder per song, in it a folder per voice with its part (PDF) and melody (MP3).
  downloads: {
    title: "Noty a nahrávky pro členy",
    intro:
      "Vyberte svůj hlas. Noty a cvičné nahrávky jsou ve sdíleném úložišti sboru, ve složce každé písně najdete složku svého hlasu.",
    restricted: "Jen pro vnitřní potřebu sboru",
    items: ["Soprán", "Alt", "Tenor", "Bas"].map((label) => ({
      label,
      href: CHOIR_FOLDER,
      note: "noty (PDF) a nahrávky (MP3)",
    })),
  },
};

export const youth: GroupPage = {
  id: "spolecenstvi_mladych",
  name: "Společenství mládeže",
  note: "každou neděli 18:30",
  href: links.youth,
  tagline: "Pro ty, kdo chtějí poznat nové kamarády a být součástí společenství.",
  hero: {
    src: `${uploads("spolecenstvi_mladych")}/plakat.webp`,
    small: `${uploads("spolecenstvi_mladych")}/plakat-nahled.webp`,
    alt: "Plakát společenství mladých: kříž složený z lidí",
    poster: true,
  },
  about: [
    "Scházíme se každou neděli večer. Povídáme si, hrajeme hry, zpíváme, modlíme se a občas vyrážíme na výlety nebo víkendovky.",
    "Rádi přivítáme všechny, kdo chtějí sdílet společné chvíle s mladými. Přijít může každý od zhruba 15 let – nemusíš nikoho znát, stačí přijít.",
  ],
  when: [{ label: "Každou neděli", text: "18:30–20:30" }],
  where: { name: "Obvykle farní klubovna", address: "místo se může změnit – vždy je v kalendáři" },
  contacts: [{ name: "Olda Sychra, Lexa Krška", role: "vedoucí společenství", phone: "605 421 448" }],
  nextMeeting: { calendarTitle: "společenství mladých" },
};

const KATECHEZE = uploads("katecheze_pro_deti");

export const catechesis: GroupPage = {
  id: "katecheze_pro_deti",
  name: "Katecheze pro děti",
  note: "každou neděli při mši v 9:30",
  href: links.catechesis,
  tagline: "Děti od 3 let prožívají nedělní mši po svém – s příběhem, hrou a modlitbou.",
  hero: {
    src: `${KATECHEZE}/katecheze-uvod.webp`,
    small: `${KATECHEZE}/katecheze-uvod-nahled.webp`,
    alt: "Děti při katechezi sedí na lavicích v sále na faře",
  },
  aboutTitle: "Pro rodiče",
  about: [
    "Malé děti mši ještě nerozumějí a dlouhé sezení je pro ně těžké. Proto pro ně při nedělní mši v 9:30 připravujeme vlastní program – slyší stejné evangelium jako dospělí, ale řečí, které rozumějí.",
    "Zváni jsou děti od 3 let. Rodiče jsou vítáni, mohou jít s dětmi nebo zůstat na mši. Nedělní mše s katechezí pro děti máme od září 2007.",
  ],
  when: [{ label: "Každou neděli", text: "při mši v 9:30" }],
  where: { name: "Kostel sv. Maří Magdaleny", address: "katecheze na faře vedle kostela" },
  contacts: [{ name: "Jana Kytnerová", role: "katechetka" }],
  steps: [
    { title: "Začátek mše", text: "Děti jsou s rodiči v kostele." },
    { title: "Po evangeliu", text: "Odcházejí s katechetkou na faru." },
    { title: "Katecheze", text: "Příběh, rozhovor, hra a modlitba." },
    { title: "Obětování", text: "Děti se vracejí za rodiči do kostela." },
  ],
  photos: Array.from({ length: 8 }, (_, i) => photo("katecheze_pro_deti")(i + 1)),
  linkCard: {
    title: "Mimořádné katecheze",
    text: "Příběhy na doma pro advent, půst, Vánoce a Velikonoce",
    // Not rebuilt here: the stories stay on the old site.
    href: `${OLD_SITE_URL}/katecheze_pro_deti/mimoradne/rozcestnik`,
  },
};

/** The groups with a page here, one route each; also "Další skupiny", in this order. */
export const groupPages: GroupPage[] = [schola, choir, youth, catechesis];
