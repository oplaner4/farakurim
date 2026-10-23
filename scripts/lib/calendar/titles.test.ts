import { describe, expect, it } from "vitest";
import { matchingTitles } from "./titles";

describe("matchingTitles", () => {
  it.each([
    ["Farní den", "Farní den 2026"],
    ["Hody v České", "Hody Česká"],
    ["Obnova pro manžele", "Manželská obnova “Láska a Pravda”"],
    ["Paray-le-Monial s komunitou Emmanuel", "Pouť do Francie (Paray-le-Monial)"],
    ["Adorační den kuřimské farnosti", "Adorační den farnosti"],
    ["Zrušeno: Farní ples", "FARNI PLES"],
  ])("matches %j and %j", (a, b) => {
    expect(matchingTitles(a, b)).toBe(true);
  });

  it.each([
    ["Tříkrálový koncert", "3králový koncert ZUŠ"],
    ["Farní den", "Farní kavárna"],
    ["", "Farní den"],
    ["800", "800 let"],
  ])("does not match %j and %j", (a, b) => {
    expect(matchingTitles(a, b)).toBe(false);
  });
});
