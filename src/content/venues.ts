import type { Venue, VenueId } from "@/content/types/venues";

// The parish's buildings, written once: the services, Kontakty, Betlémy and the Bohoslužby calendar refer to them by id.

export const venues: Record<VenueId, Venue> = {
  "kurim-kostel": {
    name: "Kostel sv. Maří Magdalény",
    village: "Kuřim",
    address: "Kostel sv. Maří Magdalény, Křížkovského, 664 34 Kuřim, Česko",
    mapQuery: "kostel sv. Maří Magdalény Kuřim",
  },
  "kurim-fara": {
    name: "Fara",
    village: "Kuřim",
    address: "Křížkovského 55/5, 664 34 Kuřim, Česko",
    mapQuery: "Křížkovského 55/5 Kuřim",
  },
  "kurim-kaple-panny-marie-bolestne": {
    name: "Kaple Panny Marie Bolestné",
    village: "Kuřim",
    catalogueHref: "https://katalog.biskupstvi.cz/detail/kostel/7414/Ku%C5%99im,%20kaple-Panny-Marie-Bolestne",
  },
  "kurim-kaple-jana-nepomuckeho": {
    name: "Kaple sv. Jana Nepomuckého",
    village: "Kuřim",
    catalogueHref: "https://katalog.biskupstvi.cz/detail/kostel/8128/Ku%C5%99im,%20kaple-sv-Jana-Nepomuckeho",
  },
  "moravske-kninice-kostel": {
    name: "Kostel sv. Markéty",
    village: "Moravské Knínice",
    address: "Kostel svaté Markéty, 386, 664 34 Moravské Knínice, Česko",
    mapQuery: "kostel sv. Markéty Moravské Knínice",
  },
  "moravske-kninice-kaple-cyrila-a-metodeje": {
    name: "Kaple sv. Cyrila a Metoděje",
    village: "Moravské Knínice",
    catalogueHref:
      "https://katalog.biskupstvi.cz/detail/kostel/6910/Moravsk%C3%A9%20Kn%C3%ADnice,%20kaple-sv-Cyrila-a-Metodeje",
  },
  "moravske-kninice-kaple-jana-nepomuckeho": {
    name: "Kaple sv. Jana Nepomuckého",
    village: "Moravské Knínice",
    catalogueHref:
      "https://katalog.biskupstvi.cz/detail/kostel/6937/Moravsk%C3%A9%20Kn%C3%ADnice,%20kaple-sv-Jana-Nepomuckeho",
  },
  "jinacovice-kaple": {
    name: "Kaple sv. Máří Magdaleny",
    village: "Jinačovice",
    // The village's address, as the Bohoslužby calendar has carried it.
    address: "Jinačovice, 664 34 Jinačovice-Kuřim, Česko",
    mapQuery: "kaple sv. Máří Magdaleny Jinačovice",
  },
  "ceska-kaple": {
    name: "Kaple Panny Marie Růžencové",
    village: "Česká",
    // A search of the chapel's name finds another place; its address finds the chapel.
    address: "Česká 20, 664 31 Česká, Česko",
  },
};
