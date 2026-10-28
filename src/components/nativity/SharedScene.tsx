import type { NativitySharedScene } from "@/content/types/nativity";
import { formatShortDate } from "@/lib/shared/czech";
import { telHref } from "@/lib/shared/links";
import { NativitySection } from "./NativitySection";

/** "6. – 24. 12.", "28. 11. – 24. 12." */
const span = (from: string, to: string) =>
  `${from.slice(0, 7) === to.slice(0, 7) ? `${Number(from.slice(8))}.` : formatShortDate(from)} – ${formatShortDate(to)}`;

/** "Společný kuřimský betlém" (design/DESIGN.md §30.2): what to bring, when and where, and whom to ask. */
export function SharedScene({ scene }: { scene: NativitySharedScene }) {
  const facts = [
    ["Výška", scene.maxHeight],
    ["Kdy", span(scene.from, scene.to)],
    ["Kam", scene.where],
  ];
  return (
    <NativitySection id="figurka" title="Společný kuřimský betlém" color="green">
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-24 bg-green-tint p-5 md:flex-row md:gap-7 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7">
        <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-green shard-tr" />
        <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
          <p>
            Od roku {scene.since} společně stavíme kuřimský betlém. Přidejte do něj figurku, kterou sami vyrobíte –
            postavičku, zvíře nebo domek.
          </p>
          <dl className="flex flex-wrap gap-2">
            {facts.map(([term, value]) => (
              <div key={term} className="flex flex-col rounded-14 bg-raised px-3.5 py-2.5 leading-card">
                <dt className="text-13 text-muted">{term}</dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative flex flex-col gap-2 rounded-16 bg-raised p-4 md:w-65 md:flex-none">
          <span className="text-13 font-bold tracking-caps text-green-ink uppercase">Dotazy</span>
          <a href={telHref(scene.phone)} className="text-20 font-bold">
            {scene.phone}
          </a>
        </div>
      </div>
    </NativitySection>
  );
}
