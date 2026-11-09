import { clsx } from "clsx";
import type { NativitySchoolVisit } from "@/content/types/nativity";
import type { IsoDate } from "@/content/types/shared";
import { formatWeekdayDate } from "@/lib/shared/czech";

function Slot({ slot }: { slot?: { from: string; to: string } }) {
  if (slot) return `${slot.from}–${slot.to}`;
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">nevyhrazeno</span>
    </>
  );
}

/**
 * "Pro školy a školky" under the opening hours: the times reserved for the classes of schools and nurseries, one
 * row per day on a blue card, set apart from the public opening days (today on the green tint, the past days
 * faded). The classes have their slots already, so the page names only the times.
 */
export function SchoolVisits({ visits, today }: { visits: NativitySchoolVisit[]; today: IsoDate }) {
  const head = clsx("px-4 py-2.5 text-left text-14 font-bold text-muted");
  return (
    <div className="relative mt-3 flex flex-col gap-3 overflow-hidden rounded-24 bg-blue-tint p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7">
      <span aria-hidden="true" className="absolute top-0 right-0 size-12 bg-blue shard-tr" />
      <div className="relative flex flex-col gap-1.5 pr-10">
        <h3 id="doba-skoly" className="text-20 leading-heading font-bold">
          Pro školy a školky
        </h3>
        <p className="text-15 text-ink-2">
          Tyto časy jsou vyhrazené pro předem domluvené návštěvy tříd ze škol a mateřských škol.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-16 bg-raised">
        <table aria-labelledby="doba-skoly" className="w-full border-collapse text-16">
          <thead>
            <tr>
              <th scope="col" className={head}>
                <span className="sr-only">Den</span>
              </th>
              <th scope="col" className={head}>
                Školy
              </th>
              <th scope="col" className={head}>
                Školky
              </th>
            </tr>
          </thead>
          <tbody>
            {visits.map((visit) => {
              const isToday = visit.date === today;
              return (
                <tr
                  key={visit.date}
                  className={clsx(
                    "border-t border-line",
                    isToday && "bg-green-tint",
                    visit.date < today && "opacity-55",
                  )}
                >
                  <th scope="row" className="px-4 py-2.5 text-left font-normal whitespace-nowrap md:w-36 lg:w-40">
                    {formatWeekdayDate(visit.date).toLowerCase()}
                  </th>
                  <td className="px-4 py-2.5 font-bold whitespace-nowrap text-blue-ink md:w-36 lg:w-40">
                    <Slot slot={visit.schools} />
                  </td>
                  <td className="px-4 py-2.5 font-bold whitespace-nowrap text-blue-ink">
                    <Slot slot={visit.nurseries} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
