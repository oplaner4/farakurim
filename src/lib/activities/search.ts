import type { Activity, ActivityGroup } from "@/content/types/activities";
import { fold, plural } from "@/lib/shared/czech";

// Seznam aktivit (design/DESIGN.md §25): the search and the group filter.

/** "Vše": every group. */
export const ALL_GROUPS = "vse";

/** Nobody is responsible yet: the contact line says "hledáme" and is shown as an invitation. */
export const seeksHelp = (activity: Pick<Activity, "contacts">) => fold(activity.contacts).includes("hledame");

/** The search finds the name, the contacts and the frequency, without case or diacritics ("uklid" → "Úklid"). */
export function matchesActivity(activity: Activity, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const text = fold([activity.name, activity.contacts, activity.when ?? ""].join(" "));
  return words.every((word) => text.includes(word));
}

/** The groups the filter (`ALL_GROUPS` or a group id) and the search leave, without the emptied ones. */
export function filterActivities(groups: ActivityGroup[], group: string, query: string): ActivityGroup[] {
  return groups
    .filter((g) => group === ALL_GROUPS || g.id === group)
    .map((g) => ({ ...g, activities: g.activities.filter((a) => matchesActivity(a, query)) }))
    .filter((g) => g.activities.length > 0);
}

/** "Zobrazena jedna aktivita", "Zobrazeny 2 aktivity", "Nalezeno 5 aktivit". */
export function activityCount(verb: "Nalezen" | "Zobrazen", n: number): string {
  const noun = plural(n, ["aktivita", "aktivity", "aktivit"]);
  return `${verb}${plural(n, ["a", "y", "o"])} ${n === 1 ? "jedna" : n} ${noun}`;
}
