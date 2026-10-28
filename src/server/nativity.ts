import "server-only";
import { nativitySeasons } from "@/content/nativity";
import { currentSeason } from "@/lib/nativity/season";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";

// Betlémy (design/DESIGN.md §30): what the page passes to the browser.

/** The build day's season and the newer ones: the only seasons the page can show until the next build. */
export const shownNativitySeasons = nativitySeasons.slice(
  0,
  nativitySeasons.indexOf(currentSeason(nativitySeasons, pragueDate(BUILD_TIME))) + 1,
);
