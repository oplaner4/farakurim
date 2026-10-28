import type { NativityWalk } from "@/content/types/nativity";
import { plural } from "@/lib/shared/czech";
import { PinIcon } from "@/components/ui/icons/contact-icons";
import { NativityStarIcon } from "@/components/ui/icons/nativity-icons";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";
import { NativitySection } from "./NativitySection";

/**
 * "Betlémské putování Kuřimí" (design/DESIGN.md §30.2): the walk, what it offers children and adults, its date and
 * start, and the poster with the route (a designed placeholder until the year's poster is uploaded).
 */
export function Walk({ walk }: { walk: NativityWalk }) {
  const scenes = `${walk.stops} ${plural(walk.stops, ["betlém", "betlémy", "betlémů"])}`;
  return (
    <NativitySection id="putovani" title="Betlémské putování Kuřimí" color="magenta">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-7">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p>
            Vánoční procházka Kuřimí od betlému k betlému. Po cestě uvidíte <strong>{scenes}</strong>
            {walk.note && `, ${walk.note}`}.
          </p>
          <ul className="grid gap-2.5 md:grid-cols-2">
            <li className="flex gap-3 rounded-18 bg-magenta-tint p-4">
              <span
                aria-hidden="true"
                className="flex size-11 flex-none items-center justify-center rounded-12 bg-raised text-magenta-ink"
              >
                <NativityStarIcon size={22} />
              </span>
              <span className="flex flex-col">
                <strong>Pro děti</strong>
                <span className="text-15 text-ink-2">
                  Sbírejte písmena z hvězdiček. Na konci cesty vám prozradí, který den slavíme Ježíškovy narozeniny.
                </span>
              </span>
            </li>
            <li className="flex gap-3 rounded-18 bg-surface p-4">
              <span
                aria-hidden="true"
                className="flex size-11 flex-none items-center justify-center rounded-12 bg-raised text-blue-ink"
              >
                <PinIcon size={22} />
              </span>
              <span className="flex flex-col">
                <strong>Pro dospělé</strong>
                <span className="text-15 text-ink-2">
                  Pohled na {walk.stops} krásných betlémů a hezká procházka vánoční Kuřimí.
                </span>
              </span>
            </li>
          </ul>
          <p className="text-15 text-muted">
            Termín a začátek trasy: <strong>{walk.schedule ?? "upřesníme"}</strong>
          </p>
        </div>
        <div
          aria-hidden="true"
          className="relative flex aspect-a4 w-full max-w-65 flex-none items-center justify-center overflow-hidden rounded-16 bg-magenta-tint-alt text-magenta-ink md:w-50"
        >
          <PosterPlaceholder iconSize={32} className="size-24" />
        </div>
      </div>
    </NativitySection>
  );
}
