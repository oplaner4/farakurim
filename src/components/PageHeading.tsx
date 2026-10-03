import { clsx } from "clsx";
import { links } from "@/content/site";
import type { SectionColor } from "./SectionHeading";

const shards: Record<SectionColor, string> = {
  blue: "bg-blue",
  green: "bg-green",
  magenta: "bg-magenta",
  orange: "bg-orange",
};

/** Breadcrumb "Úvod › <title>" and the page's visible <h1> with a shard in the section colour. */
export function PageHeading({ title, color }: { title: string; color: SectionColor }) {
  return (
    <div className="flex flex-col gap-2 md:gap-2.5 lg:gap-3">
      <nav aria-label="Drobečková navigace" className="text-14 text-muted md:text-15">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <a href={links.home}>Úvod</a>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">›</span>
            <span aria-current="page">{title}</span>
          </li>
        </ol>
      </nav>
      <div className="flex items-center gap-3 md:gap-3.5 lg:gap-4">
        <span
          aria-hidden="true"
          className={clsx("h-7 w-5 shrink-0 shard-br md:h-8.5 md:w-6 lg:h-10 lg:w-7", shards[color])}
        />
        <h1 className="text-36 leading-display font-bold tracking-title md:text-44 lg:text-56 lg:leading-hero lg:tracking-hero">
          {title}
        </h1>
      </div>
    </div>
  );
}
