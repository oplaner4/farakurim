import { describe, expect, it } from "vitest";
import { guessCategory, serviceFlags } from "./porad-guess";

describe("serviceFlags", () => {
  it("flags masses, a funeral mass too, and mass-like services in any place", () => {
    expect(
      [
        ["Mše sv.", "Mše sv. – za farníky"],
        ["Hodová mše sv.", "Hodová mše sv."],
        ["Mše sv.", "Mše sv. – pohřeb pana Nováka"],
        ["Adorace", "Adorace"],
        ["Modlitba sv. růžence a požehnání", "Modlitba sv. růžence a požehnání"],
        ["Novéna k Duchu svatému", "Novéna k Duchu svatému"],
        ["Velkopáteční obřady", "Velkopáteční obřady"],
        ["Štědrovečerní bohoslužba s dětmi", "Štědrovečerní bohoslužba s dětmi"],
        ["Májová pobožnost", "Májová pobožnost"],
      ].map(([title, line]) => serviceFlags(title, line)),
    ).toEqual([
      { mass: true },
      { mass: true },
      { mass: true },
      { service: true },
      { service: true },
      { service: true },
      { service: true },
      { service: true },
      { service: true },
    ]);
  });

  it("leaves personal events, confessions and the Way of the Cross to the user", () => {
    expect(
      ["Pohřeb", "Svatební obřad", "Zpovídání", "Křížová cesta"].map((title) => serviceFlags(title, title)),
    ).toEqual([{}, {}, {}, {}]);
  });
});

describe("guessCategory", () => {
  it("guesses from the words, info when nothing fits", () => {
    expect(
      [
        "V Kuřimi se zpovídá ve čtvrtek od 17.30 hod.",
        "Mše sv. v pátek nebude.",
        "Děkujeme všem, kdo přišli na adorační den.",
        "Srdečně zveme na koncert.",
        "Sbírka příští neděli je na misie.",
      ].map(guessCategory),
    ).toEqual(["smireni", "zmena", "podekovani", "pozvanka", "info"]);
  });
});
