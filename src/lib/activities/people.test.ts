import { describe, expect, it } from "vitest";
import { initials } from "./people";

describe("initials", () => {
  it.each([
    ["Hanka Prokopová", "HP"],
    ["Lenka Psotová", "LP"],
    ["P. Jaroslav Filka", "JF"],
    ["Mgr. Ludmila Císařová", "LC"],
    ["Jan Amos Komenský", "JK"],
    ["Ondra", "O"],
  ])("%s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
