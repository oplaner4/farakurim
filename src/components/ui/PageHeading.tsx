import { clsx } from "clsx";
import type { ReactNode } from "react";
import { links } from "@/content/site";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import type { SectionColor } from "./SectionHeading";

const shards: Record<SectionColor, string> = {
  blue: "bg-blue",
  green: "bg-green",
  magenta: "bg-magenta",
  orange: "bg-orange",
};

const titleSizes = {
  /* Pořad bohoslužeb, Kontakty */
  standard: "text-32 md:text-44 lg:text-56",
  /* Aktuality */
  large: "text-36 md:text-44 lg:text-56",
  /* Archiv aktualit */
  medium: "text-32 md:text-42 lg:text-52",
};

type Props = {
  title: string;
  color: SectionColor;
  /** Breadcrumb trail between "Úvod" and this page. */
  parents?: Crumb[];
  /** Breadcrumb label of this page when it differs from the title ("Archiv"). */
  crumb?: string;
  /** One line under the title. */
  intro?: string;
  size?: keyof typeof titleSizes;
  /** A hero photo between the breadcrumb and the title (the group pages). */
  media?: ReactNode;
  /** A small uppercase line above the title in the section's ink ("Farní tábor"). */
  eyebrow?: string;
  /** An icon before the eyebrow (the Betlémy star). */
  eyebrowIcon?: ReactNode;
  /** Under the intro (the Tábor pages' sub-navigation). */
  children?: ReactNode;
};

const eyebrowInks: Record<SectionColor, string> = {
  blue: "text-blue-ink",
  green: "text-green-ink",
  magenta: "text-magenta-ink",
  orange: "text-orange-ink",
};

/** Breadcrumb "Úvod › … › <page>", the page's visible <h1> with a shard in the section colour and an intro. */
export function PageHeading({
  title,
  color,
  parents = [],
  crumb = title,
  intro,
  size = "large",
  media,
  eyebrow,
  eyebrowIcon,
  children,
}: Props) {
  const heading = (
    <div className="flex items-center gap-3 md:gap-3.5 lg:gap-4">
      <span
        aria-hidden="true"
        className={clsx("h-7 w-5 shrink-0 shard-br md:h-8.5 md:w-6 lg:h-10 lg:w-7", shards[color])}
      />
      <h1
        className={clsx("leading-display font-bold tracking-title lg:leading-hero lg:tracking-hero", titleSizes[size])}
      >
        {title}
      </h1>
    </div>
  );
  return (
    <div className={clsx("flex flex-col", media || eyebrow ? "gap-3.5" : "gap-2 md:gap-2.5 lg:gap-3")}>
      <Breadcrumbs parents={[{ label: "Úvod", href: links.home }, ...parents]} current={crumb} />
      {media}
      {eyebrow ? (
        <div className="flex flex-col gap-1.5">
          <p
            className={clsx(
              "flex items-center gap-1.5 text-13 font-bold tracking-eyebrow uppercase",
              eyebrowInks[color],
            )}
          >
            {eyebrowIcon}
            {eyebrow}
          </p>
          {heading}
        </div>
      ) : (
        heading
      )}
      {intro && <p className="text-15 text-ink-2 md:text-17 lg:text-18">{intro}</p>}
      {children}
    </div>
  );
}
