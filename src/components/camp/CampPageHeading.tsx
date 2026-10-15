import { clsx } from "clsx";
import { links } from "@/content/site";
import { PageHeading } from "@/components/ui/PageHeading";

const pages = [
  { label: "O táboru", href: links.campAbout },
  { label: "Vedoucí", href: links.campTeam },
  { label: "Kontakt", href: links.campContact },
  { label: "Ročníky", href: links.campYears },
] as const;

export type CampPage = (typeof pages)[number]["label"];

/**
 * The shared header of the Tábor pages (design/DESIGN.md §29.1): breadcrumb "Úvod › Tábor › <page>", the eyebrow
 * "Farní tábor", the title with the magenta shard, a lead and the sub-navigation: 44 px pills, the current one
 * filled; on mobile one scrolling row bleeding to the screen edges, from tablet up a wrapping row.
 */
export function CampPageHeading({ page, intro }: { page: CampPage; intro: string }) {
  return (
    <PageHeading
      title={page}
      color="magenta"
      size="standard"
      eyebrow="Farní tábor"
      parents={[{ label: "Tábor", href: links.campAbout }]}
      intro={intro}
    >
      <nav aria-label="Stránky tábora">
        <ul className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:py-0">
          {pages.map((p) => {
            const current = p.label === page;
            return (
              <li key={p.href} className="flex-none">
                <a
                  href={p.href}
                  aria-current={current ? "page" : undefined}
                  className={clsx(
                    "flex min-h-11 items-center rounded-full border-thin px-4.5 text-15 font-bold whitespace-nowrap no-underline md:text-16",
                    current
                      ? "border-magenta bg-magenta text-white hover:text-white"
                      : "border-line bg-surface text-ink hover:border-magenta hover:text-ink",
                  )}
                >
                  {p.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </PageHeading>
  );
}
