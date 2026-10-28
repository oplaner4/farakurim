import { yearsSinceGreccio } from "@/lib/nativity/season";
import { plural } from "@/lib/shared/czech";
import { NativityStarIcon } from "@/components/ui/icons/nativity-icons";

/** "Proč stavíme betlémy" (design/DESIGN.md §30.2): St Francis's first nativity scene, years counted to `year`. */
export function WhyNativity({ year }: { year: number }) {
  const years = yearsSinceGreccio(year);
  return (
    <aside
      aria-labelledby="proc-betlemy"
      className="flex items-start gap-4 rounded-20 bg-blue-tint p-4 md:p-5 lg:rounded-24 lg:p-6"
    >
      <span
        aria-hidden="true"
        className="flex size-12 flex-none items-center justify-center rounded-14 bg-raised text-orange"
      >
        <NativityStarIcon size={24} />
      </span>
      <span className="flex flex-col gap-1">
        <strong id="proc-betlemy" className="text-18">
          Proč stavíme betlémy
        </strong>
        <span className="text-ink-2">
          Betlém (jesličky) je prostorové zobrazení narození Ježíše. Tradice sahá ke sv. Františkovi z Assisi, který
          první betlém postavil roku 1223 v italském Grecciu – letos je to {years}{" "}
          {plural(years, ["rok", "roky", "let"])}.
        </span>
      </span>
    </aside>
  );
}
