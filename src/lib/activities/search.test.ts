import { describe, expect, it } from "vitest";
import { activityGroups } from "@/content/activities";
import type { ActivityGroup } from "@/content/types/activities";
import { activityCount, ALL_GROUPS, filterActivities, matchesActivity, seeksHelp } from "./search";

const groups: ActivityGroup[] = [
  {
    id: "pravidelne",
    title: "Pravidelné",
    color: "green",
    activities: [
      { name: "Úklid kostela", when: "1× týdně", contacts: "Anička Drahovská" },
      { name: "Farní kavárna", when: "každou neděli po mši v 10:30", contacts: "Tomáš Planer" },
    ],
  },
  {
    id: "jednorazove",
    title: "Jednorázové a roční",
    color: "magenta",
    activities: [{ name: "Farní den", contacts: "hledáme" }],
  },
];

describe("matchesActivity", () => {
  const cafe = groups[0].activities[1];

  it("finds the name, the contacts and the frequency without diacritics or case", () => {
    expect(matchesActivity(groups[0].activities[0], "uklid")).toBe(true);
    expect(matchesActivity(cafe, "PLANER")).toBe(true);
    expect(matchesActivity(cafe, "neděli")).toBe(true);
  });

  it("needs every word and matches anything for an empty query", () => {
    expect(matchesActivity(cafe, "kavárna Planer")).toBe(true);
    expect(matchesActivity(cafe, "kavárna Císař")).toBe(false);
    expect(matchesActivity(cafe, "  ")).toBe(true);
  });
});

describe("filterActivities", () => {
  it("keeps every group for Vše and only the chosen one otherwise", () => {
    expect(filterActivities(groups, ALL_GROUPS, "").map((g) => g.id)).toEqual(["pravidelne", "jednorazove"]);
    expect(filterActivities(groups, "jednorazove", "").map((g) => g.id)).toEqual(["jednorazove"]);
  });

  it("drops the groups the search empties", () => {
    const found = filterActivities(groups, ALL_GROUPS, "farni");
    expect(found.map((g) => [g.id, g.activities.map((a) => a.name)])).toEqual([
      ["pravidelne", ["Farní kavárna"]],
      ["jednorazove", ["Farní den"]],
    ]);
    expect(filterActivities(groups, ALL_GROUPS, "nic takového")).toEqual([]);
  });

  it("counts the real list like the design: 24 + 8 + 28", () => {
    expect(activityGroups.map((g) => g.activities.length)).toEqual([24, 8, 28]);
  });
});

describe("seeksHelp", () => {
  it("spots the activities still looking for someone", () => {
    expect(seeksHelp({ contacts: "hledáme" })).toBe(true);
    expect(seeksHelp({ contacts: "Standa Krčma (MK) · v Kuřimi hledáme" })).toBe(true);
    expect(seeksHelp({ contacts: "Tomáš Planer" })).toBe(false);
  });
});

describe("activityCount", () => {
  it.each([
    ["Zobrazen", 1, "Zobrazena jedna aktivita"],
    ["Zobrazen", 2, "Zobrazeny 2 aktivity"],
    ["Zobrazen", 60, "Zobrazeno 60 aktivit"],
    ["Nalezen", 4, "Nalezeny 4 aktivity"],
    ["Nalezen", 0, "Nalezeno 0 aktivit"],
  ] as const)("%s %i → %s", (verb, n, expected) => {
    expect(activityCount(verb, n)).toBe(expected);
  });
});
