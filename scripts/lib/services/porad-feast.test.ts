import { describe, expect, it } from "vitest";
import { feastCase } from "./porad-feast";

describe("feastCase", () => {
  it("puts a name in capitals into sentence case, keeping the names of God, Mary and the saints", () => {
    expect(
      [
        ["SLAVNOST MATKY BOŽÍ PANNY MARIE"],
        ["SLAVNOST VŠECH SVATÝCH"],
        ["SVÁTEK SVATÉ RODINY"],
        ["SLAVNOST NEJSVĚTĚJŠÍ TROJICE"],
        ["2. NEDĚLE PO NAROZENÍ PÁNĚ"],
        ["SLAVNOST SV. MAŘÍ MAGDALENY"],
        ["SLAVNOST SV. PETRA A PAVLA, APOŠTOLŮ"],
        ["sv. Radim"],
      ].map(feastCase),
    ).toEqual([
      "Slavnost Matky Boží Panny Marie",
      "Slavnost Všech svatých",
      "Svátek Svaté rodiny",
      "Slavnost Nejsvětější Trojice",
      "2. neděle po Narození Páně",
      "Slavnost sv. Maří Magdaleny",
      "Slavnost sv. Petra a Pavla, apoštolů",
      "sv. Radim",
    ]);
  });

  it("joins the lines of a wrapped name", () => {
    expect(
      [
        ["SLAVNOST SV. PETRA", "A PAVLA"],
        ["5. NEDĚLE", "POSTNÍ"],
        ["Svátek", "KŘTU PÁNĚ"],
        ["Slavnost", "MATKY BOŽÍ", "P. MARIE"],
        ["Pondělí", "6. týdne v mezidobí"],
        ["Středa", "po 5. neděli postní"],
        ["Vigilie slavnosti", "Zjevení Páně", "(Tří králů)"],
        ["Panna Maria,", "Matka jednoty křesťanů"],
      ].map(feastCase),
    ).toEqual([
      "Slavnost sv. Petra a Pavla",
      "5. neděle postní",
      "Svátek Křtu Páně",
      "Slavnost Matky Boží P. Marie",
      "Pondělí 6. týdne v mezidobí",
      "Středa po 5. neděli postní",
      "Vigilie slavnosti Zjevení Páně (Tří králů)",
      "Panna Maria, Matka jednoty křesťanů",
    ]);
  });

  it("joins a cell's names by a dash", () => {
    expect(
      [
        ["SLAVNOST POSVĚCENÍ FARNÍHO", "KOSTELA", "29. NEDĚLE V MEZIDOBÍ"],
        ["UVEDENÍ PÁNĚ DO CHRÁMU", "Hromnice"],
        ["32. NEDĚLE V MEZIDOBÍ", "sv. Martin"],
        ["6. neděle v mezidobí", "P. Maria Lurdská"],
        ["sv. Filip a Jakub", "první pátek"],
        ["16. NEDĚLE V MEZIDOBÍ", "–", "SV. MAŘÍ MAGDALENA"],
        ["16. NEDĚLE V MEZIDOBÍ–SV. MAŘÍ MAGDALENA"],
        ["2. svátek vánoční", "– sv. Štěpána"],
      ].map(feastCase),
    ).toEqual([
      "Slavnost posvěcení farního kostela – 29. neděle v mezidobí",
      "Uvedení Páně do chrámu – Hromnice",
      "32. neděle v mezidobí – sv. Martin",
      "6. neděle v mezidobí – P. Maria Lurdská",
      "sv. Filip a Jakub – první pátek",
      "16. neděle v mezidobí – sv. Maří Magdalena",
      "16. neděle v mezidobí – sv. Maří Magdalena",
      "2. svátek vánoční – sv. Štěpána",
    ]);
  });
});
