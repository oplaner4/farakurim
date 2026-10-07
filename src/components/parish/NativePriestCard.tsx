import { clsx } from "clsx";
import type { NativePriest } from "@/content/types/parish";
import { withExternalLinkTargets } from "@/lib/shared/links";

/** One priest of Kněží – rodáci: the name, birth, ordination and death, and the longer text where there is one. */
export function NativePriestCard({ priest }: { priest: NativePriest }) {
  const facts = [
    { label: "Narozen", value: priest.born },
    { label: "Vysvěcen", value: priest.ordained },
    { label: "Zemřel", value: priest.died },
  ].filter((fact) => fact.value);
  return (
    <li
      className={clsx(
        "flex flex-col gap-2.5 rounded-18 bg-surface p-4.5 md:p-5",
        priest.html && "md:col-span-2 lg:col-span-3",
      )}
    >
      <h2 className="text-17 leading-card font-bold md:text-18">{priest.name}</h2>
      {facts.length > 0 && (
        <dl className="flex flex-col gap-1 text-15">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-3">
              <dt className="w-20 flex-none text-muted">{fact.label}</dt>
              <dd className="text-ink-2">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {priest.note && <p className="text-15 text-ink-2">{priest.note}</p>}
      {priest.html && (
        <div
          className="rich-text max-w-170 text-15 text-ink-2 [&_a]:font-bold"
          dangerouslySetInnerHTML={{ __html: withExternalLinkTargets(priest.html) }}
        />
      )}
    </li>
  );
}
