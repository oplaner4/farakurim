import type { ChurchColor } from "./services";
import type { IsoDate } from "./shared";

/** A project of the year that donors can give to (design/DESIGN.md §22.2). Amounts are whole Kč. */
export type SupportProject = {
  /** Unique, used in element ids. */
  id: string;
  title: string;
  /** The village of the building, with its church colour (Kuřim blue, Moravské Knínice green). */
  place: { name: string; color: ChurchColor };
  /** One line on the planned works. */
  description: string;
  /** "5555": the payment reference of the project, also in its QR Platba. */
  variableSymbol: string;
  budget: number;
  grants: number;
  gifts: number;
  /** Paid for works and material so far, when known. */
  workDone?: number;
};

/** Regular gifts to the parish without a project (VS 1111). */
export type RegularGifts = {
  variableSymbol: string;
  /** Received this year up to `asOf` of the page. */
  received: number;
};

/** One year of the parish's contribution to the diocesan Fond PULS; `null` when not known yet. */
export type PulsYear = {
  year: number;
  /** "Výměr příspěvku správcem fondu": what the fund asks of the parish. */
  assessed: number;
  /** "Dary donátorů": given by donors through Donator.cz. */
  fromDonors: number | null;
  /** "Doplaceno z farních sbírek": the rest, paid from the collections. */
  fromCollections: number | null;
};

export type SupportPage = {
  /** The year of the projects ("Projekty 2026"). */
  year: number;
  /** "Stav k 30. 6. 2026": the date the amounts are valid on. */
  asOf: IsoDate;
  projects: SupportProject[];
  regularGifts: RegularGifts;
  puls: PulsYear[];
  /** Donator.cz: the Fond PULS and the Tišnov deanery project. */
  pulsUrl: string;
  pastoralUrl: string;
};
