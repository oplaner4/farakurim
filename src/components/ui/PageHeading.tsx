import { clsx } from "clsx";
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
};

/** Breadcrumb "Úvod › … › <page>", the page's visible <h1> with a shard in the section colour and an intro. */
export function PageHeading({ title, color, parents = [], crumb = title, intro, size = "large" }: Props) {
  return (
    <div className="flex flex-col gap-2 md:gap-2.5 lg:gap-3">
      <Breadcrumbs parents={[{ label: "Úvod", href: links.home }, ...parents]} current={crumb} />
      <div className="flex items-center gap-3 md:gap-3.5 lg:gap-4">
        <span
          aria-hidden="true"
          className={clsx("h-7 w-5 shrink-0 shard-br md:h-8.5 md:w-6 lg:h-10 lg:w-7", shards[color])}
        />
        <h1
          className={clsx(
            "leading-display font-bold tracking-title lg:leading-hero lg:tracking-hero",
            titleSizes[size],
          )}
        >
          {title}
        </h1>
      </div>
      {intro && <p className="text-15 text-ink-2 md:text-17 lg:text-18">{intro}</p>}
    </div>
  );
}
