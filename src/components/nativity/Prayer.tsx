import type { NativityIntentionsMass } from "@/content/types/nativity";
import type { IsoDate } from "@/content/types/shared";
import { atClockTime, formatLongDate, onWeekday } from "@/lib/shared/czech";
import { CandleIcon } from "@/components/ui/icons/nativity-icons";
import { NativitySection } from "./NativitySection";

/**
 * "Místo pro modlitbu" (design/DESIGN.md §30.2): the candles and the box for intentions, and the mass for them;
 * after the exhibition only the mass, which "byla sloužena" once its day has passed. Until the mass is known, its
 * date "upřesníme".
 */
export function Prayer({ mass, after, today }: { mass?: NativityIntentionsMass; after: boolean; today: IsoDate }) {
  const when = mass && (
    <strong>{`${onWeekday(mass.date)} ${formatLongDate(mass.date)} ${atClockTime(mass.time)}`}</strong>
  );
  return (
    <NativitySection id="modlitba" title="Místo pro modlitbu" color="orange">
      <div className="flex items-start gap-4 rounded-20 bg-surface p-4 md:p-5 lg:rounded-24 lg:p-6">
        <span
          aria-hidden="true"
          className="flex size-13 flex-none items-center justify-center rounded-14 bg-orange-tint text-orange-ink-deep"
        >
          <CandleIcon size={24} />
        </span>
        {!after ? (
          <p>
            Pod kůrem můžete zapálit svíčku na svůj úmysl a do uzavřené schránky vložit napsané poděkování nebo prosbu.{" "}
            {when ? <>Za tyto úmysly bude sloužena mše svatá {when}.</> : "Termín mše svaté za tyto úmysly upřesníme."}
          </p>
        ) : !mass ? (
          <p>Termín mše svaté za úmysly, které jste napsali na výstavě, upřesníme.</p>
        ) : mass.date >= today ? (
          <p>Mše svatá za úmysly, které jste napsali na výstavě, bude {when} v kostele v Kuřimi.</p>
        ) : (
          <p>Mše svatá za úmysly, které jste napsali na výstavě, byla sloužena {when} v kostele v Kuřimi.</p>
        )}
      </div>
    </NativitySection>
  );
}
