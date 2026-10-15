import { describe, expect, it } from "vitest";
import type { CampTeamMember } from "@/content/types/camp";
import { ageLabel, initial, membersWithPhotos, photoCaption, teamGroups } from "./team";

const photo = { small: "/uploads/tabor/vedouci/a-nahled.webp", large: "/uploads/tabor/vedouci/a.webp" };
const member = (name: string, role: CampTeamMember["role"], extra: Partial<CampTeamMember> = {}): CampTeamMember => ({
  name,
  role,
  bio: "…",
  ...extra,
});

describe("teamGroups", () => {
  it("groups the team by role in page order and keeps each member's order", () => {
    const groups = teamGroups([
      member("Anička", "Praktikantka"),
      member("Michal", "Vedoucí"),
      member("Honza", "Hlavní vedoucí"),
      member("Kuba", "Praktikant"),
      member("Bára", "Zdravotnice"),
    ]);
    expect(groups.map((g) => [g.id, g.title, g.members.map((m) => m.name)])).toEqual([
      ["hlavni-vedouci", "Hlavní vedoucí a zdravotnice", ["Honza", "Bára"]],
      ["vedouci", "Vedoucí", ["Michal"]],
      ["praktikanti", "Praktikanti", ["Anička", "Kuba"]],
    ]);
  });

  it("names a male medic and leaves out empty groups", () => {
    const groups = teamGroups([member("Honza", "Hlavní vedoucí"), member("Petr", "Zdravotník")]);
    expect(groups.map((g) => g.title)).toEqual(["Hlavní vedoucí a zdravotník"]);
  });
});

describe("photo captions", () => {
  it("writes the age with its Czech plural", () => {
    expect(ageLabel(22)).toBe("22 let");
    expect(ageLabel(1)).toBe("1 rok");
    expect(ageLabel(3)).toBe("3 roky");
  });

  it("joins the name, the role and the age when known", () => {
    expect(photoCaption(member("Honza", "Hlavní vedoucí", { age: 22 }))).toBe("Honza · Hlavní vedoucí · 22 let");
    expect(photoCaption(member("Olda", "Vedoucí"))).toBe("Olda · Vedoucí");
  });
});

describe("membersWithPhotos", () => {
  it("lists the members with a photo in page order", () => {
    const groups = teamGroups([
      member("Anička", "Praktikantka", { photo }),
      member("Olda", "Vedoucí"),
      member("Honza", "Hlavní vedoucí", { photo }),
    ]);
    expect(membersWithPhotos(groups).map((m) => m.name)).toEqual(["Honza", "Anička"]);
  });
});

describe("initial", () => {
  it("takes the name's first letter", () => {
    expect(initial("Olda")).toBe("O");
    expect(initial("áďa")).toBe("Á");
  });
});
