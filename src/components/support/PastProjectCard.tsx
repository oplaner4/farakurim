import { clsx } from "clsx";
import type { ChurchColor } from "@/content/types/services";
import type { PastProject } from "@/content/types/support";
import { formatCzk } from "@/lib/shared/czech";
import { formatAmount, projectTotals, yearSpan } from "@/lib/support/past-projects";
import { ChevronDownIcon } from "@/components/ui/icons/navigation-icons";

const placeColors: Record<ChurchColor, string> = {
  blue: "bg-blue",
  green: "bg-green",
  orange: "bg-orange",
};

const columns = [
  { label: "Rozpočet", value: "budget" },
  { label: "Dotace", value: "grants" },
  { label: "Dary", value: "gifts" },
] as const;

type Props = {
  project: PastProject;
  /** The first project shows its accounts open. */
  open?: boolean;
};

/**
 * One finished project of "Starší projekty" (design/DESIGN.md §28): place, "Dokončeno" with the years, the totals,
 * and the yearly accounts in a `<details>`, as a table from tablet up and one card per year on mobile.
 */
export function PastProjectCard({ project, open }: Props) {
  const totals = projectTotals(project);
  const titleId = `projekt-${project.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-24 bg-surface p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex max-w-170 min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-13 font-bold text-ink-2">
              <span aria-hidden="true" className={clsx("size-2.5 rounded-3", placeColors[project.place.color])} />
              {project.place.name}
            </span>
            <span className="rounded-full bg-green-tint px-2.5 py-0.5 text-13 font-bold text-green-ink">
              Dokončeno · {yearSpan(project)}
            </span>
          </div>
          <h2 id={titleId} className="text-18 leading-snug font-bold md:text-22 lg:text-26">
            {project.title}
          </h2>
          <p className="text-15 text-ink-2">{project.summary}</p>
        </div>
        <dl className="flex gap-6">
          <div>
            <dt className="text-13 text-muted">Náklady celkem</dt>
            <dd className="text-22 font-bold">{formatCzk(totals.costs)}</dd>
          </div>
          <div>
            <dt className="text-13 text-muted">Dotace celkem</dt>
            <dd className="text-22 font-bold">{formatCzk(totals.grants)}</dd>
          </div>
        </dl>
      </div>
      <details open={open} className="group border-t border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 font-bold text-blue-ink">
          Vyúčtování podle let ({project.years.length})
          <ChevronDownIcon className="flex-none group-open:rotate-180 motion-safe:transition-transform" />
        </summary>

        {/* Mobile: one card per year. */}
        <ol className="flex flex-col gap-2 md:hidden">
          {project.years.map((row, i) => (
            <li key={i} className="flex flex-col gap-1.5 rounded-14 bg-raised p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-18">{row.year}</strong>
                <strong className="text-orange-ink-deep">
                  <span className="sr-only">Náklady </span>
                  {formatCzk(row.costs)}
                </strong>
              </div>
              <span className="text-14 text-ink-2">{row.works}</span>
              <dl className="grid grid-cols-3 gap-x-2.5 gap-y-1 text-13">
                {columns.map((column) => (
                  <div key={column.value}>
                    <dt className="text-muted">{column.label}</dt>
                    <dd className="font-bold">{formatAmount(row[column.value])}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>

        {/* Tablet and desktop: a table. */}
        <div className="overflow-x-auto rounded-16 bg-raised max-md:hidden">
          <table className="w-full border-collapse text-15">
            <thead>
              <tr className="text-13 text-muted">
                <th scope="col" className="border-b-2 border-line px-3 py-2.5 text-left">
                  Rok
                </th>
                <th scope="col" className="border-b-2 border-line px-3 py-2.5 text-left">
                  Provedené práce
                </th>
                {columns.map((column) => (
                  <th key={column.value} scope="col" className="border-b-2 border-line px-3 py-2.5 text-right">
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="border-b-2 border-line px-3 py-2.5 text-right">
                  Náklady
                </th>
              </tr>
            </thead>
            <tbody>
              {project.years.map((row, i) => (
                <tr key={i} className="align-top">
                  <th scope="row" className="border-b border-line p-3 text-left">
                    {row.year}
                  </th>
                  <td className="border-b border-line p-3 text-ink-2">{row.works}</td>
                  {columns.map((column) => (
                    <td key={column.value} className="border-b border-line p-3 text-right whitespace-nowrap">
                      {formatAmount(row[column.value])}
                    </td>
                  ))}
                  <td className="border-b border-line p-3 text-right font-bold whitespace-nowrap">
                    {formatCzk(row.costs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}
