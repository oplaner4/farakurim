import type { IsoDate } from "./shared";

/** The pastoral council of the parish (Pastorační rada farnosti, PRF) in its current term. */
export type ParishCouncil = {
  /** The term of office, from the constituent meeting. */
  term: { from: IsoDate; to: IsoDate };
  /** Names with titles as the council publishes them (GDPR: names only), the parish priest first. */
  members: string[];
  email: string;
};

/** The report of one council meeting (Zápisy pastorační rady), as the council wrote it. */
export type CouncilMeeting = {
  date: IsoDate;
  /** Paragraphs and lists; plain `<a href>` links get their new-tab attributes where they are rendered. */
  html: string;
};

/** A priest born in the parish (Kněží – rodáci), with the old page's wording. */
export type NativePriest = {
  name: string;
  /** "16. 4. 1851"; only the year when the day is not known. */
  born?: string;
  /** The year and the place of the ordination with the old page's note ("1875 Brno, Ruda"). */
  ordained?: string;
  /** The day of death with an optional note ("22. 6. 2009 v Žernůvce, pohřben ve Veverské Bítýšce"). */
  died?: string;
  /** A note without a label ("t. č. Chicago"). */
  note?: string;
  /** Longer paragraphs in HTML (links to the recordings and files). */
  html?: string;
};
