import { clsx } from "clsx";
import type { NativityContest } from "@/content/types/nativity";
import { plural } from "@/lib/shared/czech";
import { ImageIcon } from "@/components/ui/icons/media-icons";
import { NativitySection } from "./NativitySection";

/** The podium's colours, 1st to 3rd. */
const podium = [
  { card: "bg-orange-tint", fill: "bg-orange text-on-orange" },
  { card: "bg-blue-tint", fill: "bg-blue text-white" },
  { card: "bg-green-tint", fill: "bg-green text-on-green" },
];

/**
 * "Soutěž o nej betlém" (design/DESIGN.md §30.2): how the contest works and how many classes take part before and
 * during the exhibition; after it, the results with a podium of three.
 */
export function Contest({ contest, voting, after }: { contest: NativityContest; voting: boolean; after: boolean }) {
  if (after) {
    return (
      <NativitySection id="soutez" title="Výsledky soutěže o nej betlém" color="blue">
        {contest.results ? (
          <>
            {contest.summary && <p className="text-ink-2">{contest.summary}</p>}
            <ol className="grid gap-3 md:grid-cols-3">
              {contest.results.map((r, i) => (
                <li
                  key={r.className}
                  className={clsx("relative flex flex-col gap-2 overflow-hidden rounded-20 p-4.5", podium[i].card)}
                >
                  <span
                    aria-hidden="true"
                    className={clsx("absolute top-0 right-0 size-11 shard-tr", podium[i].fill)}
                  />
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "flex size-12 flex-none items-center justify-center rounded-full text-20 font-bold",
                        podium[i].fill,
                      )}
                    >
                      {i + 1}.<span className="sr-only"> místo</span>
                    </span>
                    <span className="flex flex-col leading-card">
                      <strong className="text-20">{r.className}</strong>
                      <span className="text-15 text-ink-2">{r.school}</span>
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="flex aspect-4/3 items-center justify-center rounded-14 bg-raised text-muted"
                  >
                    <ImageIcon size={28} />
                  </div>
                  <span className="flex justify-between gap-2 text-15">
                    <span className="text-ink-2">{r.teacher}</span>
                    <strong>
                      {r.votes} {plural(r.votes, ["hlas", "hlasy", "hlasů"])}
                    </strong>
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-ink-2">Výsledky soutěže zveřejníme brzy.</p>
        )}
      </NativitySection>
    );
  }
  return (
    <NativitySection id="soutez" title="Soutěž o nej betlém" color="blue">
      <div className="flex flex-col gap-4 rounded-24 bg-blue-tint p-5 md:flex-row md:items-center md:gap-6 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="text-22 leading-heading font-bold">
            {voting ? "Hlasujte pro nejhezčí betlém" : "Jak soutěž probíhá"}
          </h3>
          <p className="text-ink-2">
            Betlémy vyrobené <strong>{contest.entrants}</strong> základních škol z Kuřimi a okolí.{" "}
            {voting
              ? "Vítěze vybíráte vy – hlasovat můžete přímo na výstavě. Výsledky zveřejníme po jejím skončení."
              : "Hlasovat budete moci přímo na výstavě, výsledky zveřejníme po jejím skončení."}
          </p>
        </div>
        <div className="flex gap-2.5">
          {[
            [contest.classes, plural(contest.classes, ["třída", "třídy", "tříd"])],
            [contest.villages, plural(contest.villages, ["obec", "obce", "obcí"])],
          ].map(([n, label]) => (
            <span
              key={label}
              className="flex size-23 flex-col items-center justify-center rounded-18 bg-raised text-center leading-heading"
            >
              <strong className="text-28 text-blue-ink">{n}</strong>
              <span className="text-13 text-ink-2">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </NativitySection>
  );
}
