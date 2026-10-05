import type { SupportProject } from "@/content/types/support";

/** The smallest bar width, so a project with a few hundred Kč still shows a sliver (§22.1). */
export const MIN_PROGRESS = 0.015;

/**
 * The IBAN of a Czech account number ("19-2000145399/0800", the prefix optional): CZ, the two check digits
 * (ISO 13616, mod 97) and the bank code, prefix and number padded to 4 + 6 + 10 digits.
 */
export function czechIban(account: string): string {
  const match = /^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/.exec(account.replace(/\s/g, ""));
  if (!match) throw new Error(`Not a Czech account number: ${account}`);
  const [, prefix = "", number, bank] = match;
  const bban = bank + prefix.padStart(6, "0") + number.padStart(10, "0");
  // "CZ00" moved to the end, letters as numbers (C = 12, Z = 35).
  const remainder = BigInt(`${bban}123500`) % BigInt(97);
  return `CZ${String(BigInt(98) - remainder).padStart(2, "0")}${bban}`;
}

/** "CZ65 0800 0000 1920 0014 5399" */
export const formatIban = (iban: string) => iban.replace(/(.{4})(?=.)/g, "$1 ");

type SpaydInput = { iban: string; variableSymbol: string; message: string };

/**
 * The QR Platba string (SPAYD 1.0, Czech Banking Association) for a gift without a fixed amount: the donor's bank
 * app fills in the account, the variable symbol and the message. `*` separates the fields, so it is removed from
 * values; the message is cut to the standard's 60 characters.
 */
export function spayd({ iban, variableSymbol, message }: SpaydInput): string {
  const clean = (value: string) => value.replaceAll("*", "").trim();
  return [
    "SPD*1.0",
    `ACC:${iban}`,
    "CC:CZK",
    `MSG:${clean(message).slice(0, 60)}`,
    `X-VS:${clean(variableSymbol)}`,
  ].join("*");
}

export type Progress = {
  /** Gifts plus grants. */
  raised: number;
  /** `raised / budget`, at most 1. */
  ratio: number;
  /** The bar width, at least `MIN_PROGRESS`. */
  bar: number;
};

/** How far a project is: gifts and grants against its budget (§22.1). */
export function projectProgress({ budget, gifts, grants }: Pick<SupportProject, "budget" | "gifts" | "grants">) {
  const raised = gifts + grants;
  const ratio = budget > 0 ? Math.min(1, raised / budget) : 0;
  return { raised, ratio, bar: Math.max(MIN_PROGRESS, ratio) } satisfies Progress;
}
