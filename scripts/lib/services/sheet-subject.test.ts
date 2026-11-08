import { describe, expect, it } from "vitest";
import { subjectDates, weekOf } from "./sheet-subject";

const sent = new Date("2026-11-12T08:00:00Z");
const dates = (from: string, to = from) => ({ kind: "dates", from, to });

describe("subjectDates", () => {
  it("names no week without a date", () => {
    for (const subject of ["", "Pořad bohoslužeb 2026", "Ohlášky", "Fwd: pořad", "mše v 8.00"]) {
      expect(subjectDates(subject, sent)).toEqual({ kind: "none" });
    }
  });

  it("names no week in a reply's or a forward's subject", () => {
    for (const subject of [
      "Re: Pořad 1.–8. 11.",
      "RE: Pořad 8. 11.",
      "Odp: Ohlášky 8. 11.",
      "Fwd: Pořad 8. 11.",
      "FW: Pořad 8. 11.",
      "TR: Pořad 8. 11.",
      "Re[2]: Pořad 8. 11.",
      " re : Pořad 8. 11.",
    ]) {
      expect(subjectDates(subject, sent)).toEqual({ kind: "none" });
    }
    expect(subjectDates("Oprava: Pořad 8. 11.", sent)).toEqual(dates("2026-11-08"));
    expect(subjectDates("Rekolekce 8. 11.", sent)).toEqual(dates("2026-11-08"));
  });

  it("reads the heading's form as the DOCX heading is read", () => {
    expect(subjectDates("Pořad od 15. 11. 2026 do 22. 11. 2026", sent)).toEqual(dates("2026-11-15", "2026-11-22"));
    expect(subjectDates("Pořad od 28. 12. do 4. 1. 2027", sent)).toEqual(dates("2026-12-28", "2027-01-04"));
    expect(subjectDates("Pořad od 30. 2. do 6. 3. 2026", sent)).toEqual({ kind: "invalid" });
  });

  it("reads one date, with or without the year", () => {
    expect(subjectDates("Ohlášky na neděli 15. 11.", sent)).toEqual(dates("2026-11-15"));
    expect(subjectDates("Ohlášky 15.11.2026", sent)).toEqual(dates("2026-11-15"));
    expect(subjectDates("Pořad 15. 11. 2025", sent)).toEqual(dates("2025-11-15"));
  });

  it("reads a range in the ways it is written", () => {
    expect(subjectDates("Pořad bohoslužeb 16.–22. 11.", sent)).toEqual(dates("2026-11-16", "2026-11-22"));
    expect(subjectDates("Oprava: 16. 11. - 22. 11. 2026", sent)).toEqual(dates("2026-11-16", "2026-11-22"));
    expect(subjectDates("Pořad od 15. 11. do 22. 11.", sent)).toEqual(dates("2026-11-15", "2026-11-22"));
    expect(subjectDates("Pořad 30.–6. 12.", sent)).toEqual(dates("2026-11-30", "2026-12-06"));
  });

  it("takes the year closest to the mail", () => {
    const december = new Date("2026-12-30T08:00:00Z");
    expect(subjectDates("Pořad 3. 1.", december)).toEqual(dates("2027-01-03"));
    expect(subjectDates("Pořad 28. 12.–3. 1.", december)).toEqual(dates("2026-12-28", "2027-01-03"));
    expect(subjectDates("Pořad 30.–3. 1.", december)).toEqual(dates("2026-12-30", "2027-01-03"));
  });

  it("refuses a date that does not exist", () => {
    expect(subjectDates("Pořad 31. 2.", sent)).toEqual({ kind: "invalid" });
    expect(subjectDates("Pořad 30. 2.–6. 3.", sent)).toEqual({ kind: "invalid" });
    expect(subjectDates("Pořad 22. 11.–16. 11. 2026", sent)).toEqual({ kind: "invalid" });
  });
});

describe("weekOf", () => {
  const weeks = [
    { validFrom: "2026-11-15", validTo: "2026-11-22" },
    { validFrom: "2026-11-08", validTo: "2026-11-15" },
  ];

  it("finds the week holding the dates, the newer one on a shared Sunday", () => {
    expect(weekOf(weeks, { from: "2026-11-16", to: "2026-11-22" })).toBe(weeks[0]);
    expect(weekOf(weeks, { from: "2026-11-10", to: "2026-11-10" })).toBe(weeks[1]);
    expect(weekOf(weeks, { from: "2026-11-15", to: "2026-11-15" })).toBe(weeks[0]);
  });

  it("finds none for dates outside every week or across two", () => {
    expect(weekOf(weeks, { from: "2026-11-29", to: "2026-11-29" })).toBeUndefined();
    expect(weekOf(weeks, { from: "2026-11-10", to: "2026-11-17" })).toBeUndefined();
  });
});
