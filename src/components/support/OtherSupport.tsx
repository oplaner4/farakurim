import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { ChevronDownIcon, ExternalLinkIcon } from "@/components/ui/icons/navigation-icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { PulsYear, SupportPage } from "@/content/types/support";
import { formatCzk, formatShortDate } from "@/lib/shared/czech";
import { ArrowLink } from "@/components/ui/ArrowLink";

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-2.5 rounded-20 bg-surface p-5 md:rounded-22 md:p-6 lg:rounded-24 lg:p-7"
    >
      <h3 id={id} className="text-19 font-bold md:text-20 lg:text-22">
        {title}
      </h3>
      {children}
    </section>
  );
}

const amount = (value: number | null) => (value === null ? "–" : formatCzk(value));

/** Fond PULS by year, as on the old site; collapsed, so the card stays short. */
function PulsTable({ years }: { years: PulsYear[] }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-15 font-bold text-blue-ink">
        Příspěvky farnosti podle let
        <ChevronDownIcon size={18} className="group-open:rotate-180 motion-safe:transition-transform" />
      </summary>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-14">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1.5 pr-2.5 text-left font-normal">
                Rok
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-normal">
                Výměr příspěvku
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-normal">
                Dary donátorů
              </th>
              <th scope="col" className="py-1.5 pl-2.5 text-right font-normal">
                Doplaceno ze sbírek
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year}>
                <th scope="row" className="py-2 pr-2.5 text-left font-bold">
                  {y.year}
                </th>
                <td className="px-2.5 py-2 text-right">{amount(y.assessed)}</td>
                <td className="px-2.5 py-2 text-right">{amount(y.fromDonors)}</td>
                <td className="py-2 pl-2.5 text-right">{amount(y.fromCollections)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** "Další možnosti podpory" (§22.1): regular gifts, the diocesan Fond PULS and the Tišnov deanery project. */
export function OtherSupport({ support }: { support: SupportPage }) {
  const { regularGifts } = support;
  return (
    <section aria-labelledby="dalsi-moznosti" className="flex flex-col gap-4">
      <SectionHeading id="dalsi-moznosti" title="Další možnosti podpory" color="orange" small />
      <div className="grid items-start gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        <Card id="pravidelne-dary" title="Pravidelné dary farnosti">
          <p className="text-15 text-ink-2">
            Trvalý příkaz s VS <strong className="text-ink">{regularGifts.variableSymbol}</strong> pomáhá farnosti
            plánovat. Děkujeme všem pravidelným dárcům.
          </p>
          <div className="flex flex-col gap-0.5">
            <span className="text-13 text-muted">
              Přijato v roce {support.year} (k {formatShortDate(support.asOf)})
            </span>
            <strong className="text-24">{formatCzk(regularGifts.received)}</strong>
          </div>
          <CopyButton text={regularGifts.variableSymbol} label="Zkopírovat VS" width="vs" className="self-start" />
        </Card>
        <Card id="fond-puls" title="Fond PULS">
          <p className="text-15 text-ink-2">Příspěvek do fondu pro podporu kněží a pastorace brněnské diecéze.</p>
          <PulsTable years={support.puls} />
          <ArrowLink href={support.pulsUrl} icon={ExternalLinkIcon}>
            Přispět přes Donator.cz
          </ArrowLink>
        </Card>
        <Card id="pastoracni-aktivity" title="Pastorační aktivity děkanství Tišnov">
          <p className="text-15 text-ink-2">
            Setkání mládeže, rodin a vzdělávací akce, které povzbuzují a stmelují farníky celého děkanátu.
          </p>
          <ArrowLink href={support.pastoralUrl} icon={ExternalLinkIcon} className="mt-auto">
            O projektu na Donator.cz
          </ArrowLink>
        </Card>
      </div>
    </section>
  );
}
