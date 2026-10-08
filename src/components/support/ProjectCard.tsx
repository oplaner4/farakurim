import { clsx } from "clsx";
import { CopyButton } from "@/components/ui/CopyButton";
import { parish } from "@/content/site";
import type { ChurchColor } from "@/content/types/services";
import type { SupportProject } from "@/content/types/support";
import { formatCzk, formatPercent } from "@/lib/shared/czech";
import { projectProgress } from "@/lib/support/payment";
import { PaymentQr } from "./PaymentQr";

const placeColors: Record<ChurchColor, string> = {
  blue: "bg-blue",
  green: "bg-green",
  orange: "bg-orange",
};

/**
 * One project of the year (§22.1): place, title and works, the progress of gifts and grants against the budget,
 * the amounts, and the payment box with the variable symbol and QR Platba.
 */
export function ProjectCard({ project }: { project: SupportProject }) {
  const { raised, ratio, bar } = projectProgress(project);
  const titleId = `projekt-${project.id}`;
  const amounts = [
    { label: "Rozpočet", value: project.budget },
    { label: "Dotace", value: project.grants },
    { label: "Dary", value: project.gifts },
    ...(project.workDone === undefined ? [] : [{ label: "Provedené práce", value: project.workDone }]),
  ];
  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-4 rounded-20 border border-line bg-raised p-5 md:rounded-22 md:p-6 lg:rounded-24 lg:p-7"
    >
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 self-start text-13 font-bold text-ink-2">
          <span aria-hidden="true" className={clsx("size-2.5 rounded-3", placeColors[project.place.color])} />
          {project.place.name}
        </span>
        <h3 id={titleId} className="text-19 leading-snug font-bold md:text-20 lg:text-22">
          {project.title}
        </h3>
        <p className="text-15 text-ink-2">{project.description}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 text-15">
          <span>
            <strong>{formatCzk(raised)}</strong> <span className="text-muted">z {formatCzk(project.budget)}</span>
          </span>
          <strong className="text-orange-ink-deep">{formatPercent(ratio)}</strong>
        </div>
        <div
          role="progressbar"
          aria-label="Vybráno na projekt"
          aria-valuemin={0}
          aria-valuemax={project.budget}
          aria-valuenow={raised}
          aria-valuetext={`${formatCzk(raised)} z ${formatCzk(project.budget)}`}
          className="h-3 overflow-hidden rounded-6 bg-surface"
        >
          {/* Fills from the left when the page loads, with motion allowed (§5): the width is inline, so it scales. */}
          <span
            className="block h-full origin-left rounded-6 bg-orange motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:starting:scale-x-0"
            style={{ width: `${bar * 100}%` }}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-15">
        {amounts.map(({ label, value }) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-13 text-muted">{label}</dt>
            <dd className="font-bold">{formatCzk(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-3 rounded-16 bg-orange-tint p-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-13 text-muted">Účet {parish.bankAccount}</span>
          <span className="text-17 font-bold">
            VS <span className="tracking-caps">{project.variableSymbol}</span>
          </span>
          <CopyButton
            text={project.variableSymbol}
            label="Zkopírovat VS"
            width="vs"
            size="small"
            className="mt-0.5 self-start"
          />
        </div>
        <PaymentQr variableSymbol={project.variableSymbol} project={project.title} />
      </div>
    </article>
  );
}
