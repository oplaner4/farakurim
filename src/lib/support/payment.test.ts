import { describe, expect, it } from "vitest";
import { czechIban, formatIban, MIN_PROGRESS, projectProgress, spayd } from "./payment";

/** ISO 13616 check: the IBAN with its first four characters moved to the end, as a number, mod 97 is 1. */
function ibanIsValid(iban: string): boolean {
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return BigInt(digits) % BigInt(97) === BigInt(1);
}

describe("czechIban", () => {
  it("matches the Czech National Bank's example with a prefix", () => {
    expect(czechIban("19-2000145399/0800")).toBe("CZ6508000000192000145399");
  });

  it("pads an account without a prefix", () => {
    const iban = czechIban("247704317/0300");
    expect(iban).toMatch(/^CZ\d{2}03000000000247704317$/);
    expect(ibanIsValid(iban)).toBe(true);
  });

  it("ignores spaces", () => {
    expect(czechIban(" 19-2000145399 / 0800 ")).toBe("CZ6508000000192000145399");
  });

  it.each(["247704317", "247704317/03", "abc/0300"])("rejects %s", (account) => {
    expect(() => czechIban(account)).toThrow();
  });
});

describe("formatIban", () => {
  it("groups by four", () => {
    expect(formatIban("CZ6508000000192000145399")).toBe("CZ65 0800 0000 1920 0014 5399");
  });
});

describe("spayd", () => {
  it("builds the QR Platba string without an amount", () => {
    expect(spayd({ iban: "CZ6508000000192000145399", variableSymbol: "5555", message: "Dar – Budova fary" })).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*CC:CZK*MSG:Dar – Budova fary*X-VS:5555",
    );
  });

  it("drops the field separator from values and cuts the message to 60 characters", () => {
    const value = spayd({ iban: "CZ65", variableSymbol: "55*55", message: `a*b${"x".repeat(80)}` });
    expect(value).toContain("*X-VS:5555");
    expect(value).toContain(`*MSG:ab${"x".repeat(58)}*`);
  });
});

describe("projectProgress", () => {
  it("counts gifts and grants against the budget", () => {
    expect(projectProgress({ budget: 664679, gifts: 57800, grants: 0 })).toEqual({
      raised: 57800,
      ratio: 57800 / 664679,
      bar: 57800 / 664679,
    });
    expect(projectProgress({ budget: 1000, gifts: 200, grants: 300 }).raised).toBe(500);
  });

  it("shows a sliver for a small amount", () => {
    expect(projectProgress({ budget: 330000, gifts: 500, grants: 0 }).bar).toBe(MIN_PROGRESS);
  });

  it("caps at the budget and survives a zero budget", () => {
    expect(projectProgress({ budget: 100, gifts: 150, grants: 0 }).ratio).toBe(1);
    expect(projectProgress({ budget: 0, gifts: 0, grants: 0 })).toEqual({ raised: 0, ratio: 0, bar: MIN_PROGRESS });
  });
});
