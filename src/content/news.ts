import type { NewsItem } from "./types";

// Mock content written from the live site's news on 3. 10. 2026.

const ALL_NEWS = "https://farakurim.cz/aktuality/";

export const news: NewsItem[] = [
  {
    id: "medovy-den",
    title: "Stánek farnosti na Medovém dni",
    excerpt: "Děkujeme všem, kteří pomohli s farním stánkem.",
    start: "2026-09-20",
    href: ALL_NEWS,
  },
  {
    id: "hody-ceska",
    title: "Hody v České",
    excerpt: "Srdečně zveme na tradiční hody v České.",
    start: "2026-10-02",
    end: "2026-10-04",
    href: ALL_NEWS,
  },
  {
    id: "kolac-pro-hospic",
    title: "Koláč pro hospic",
    excerpt: "Podpořte svým darem Domácí hospic Porta Vitae.",
    start: "2026-10-07",
    href: ALL_NEWS,
  },
  {
    id: "jubileum-800",
    title: "Slavnostní mše k jubileu 800 let",
    excerpt: "Slavíme 800 let kostela sv. Maří Magdalény.",
    start: "2026-10-18",
    time: "9:30",
    href: ALL_NEWS,
  },
  {
    id: "pout-lukov-trebic",
    title: "Farní pouť do Lukova a adventní Třebíče",
    excerpt: "Rodiště bl. Jana Buly a vánoční trhy. Přihlášky do 10. 10.",
    start: "2026-12-19",
    href: ALL_NEWS,
  },
];
