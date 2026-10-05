// Odkazy (design/DESIGN.md §23): the external sites the parish recommends, in groups.

/** The group's shard and card tint: Církev blue, Média magenta, Modlitba a Bible green, Obce farnosti orange. */
export type LinkGroupColor = "blue" | "magenta" | "green" | "orange";

export type WebLink = {
  name: string;
  /** One line under the name. */
  description: string;
  /** An https URL on another site; the card shows its domain. */
  href: string;
};

export type LinkGroup = {
  /** Unique, used in element ids. */
  id: string;
  title: string;
  color: LinkGroupColor;
  links: WebLink[];
};
