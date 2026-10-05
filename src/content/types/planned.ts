// Pages of the old site not rebuilt yet (planned-pages.ts): their URLs exist, with "Stránku připravujeme".

/** A placeholder page at an old-site URL (or its new place under /aktivity/). */
export type PlannedPage = {
  /** "/farni_tabor/2024/": root-relative, with the trailing slash of the static export. */
  path: string;
  title: string;
  /** The shard colour of its group in the "Více" menu. */
  color: "blue" | "green" | "magenta" | "orange";
  /** The breadcrumb between "Úvod" and this page. */
  parents?: { label: string; href: string }[];
};
