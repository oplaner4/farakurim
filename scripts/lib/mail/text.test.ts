import { describe, expect, it } from "vitest";
import { mailText } from "./text";

describe("mailText", () => {
  it("keeps only the new text of a reply", () => {
    const text = [
      "Posíláme pozvánku.",
      "",
      "> stará zpráva",
      "Dne 20. 10. 2026 v 10:00 Jan Novák napsal(a):",
      "> ještě starší",
    ].join("\n");
    expect(mailText(text)).toBe("Posíláme pozvánku.");
  });

  it("drops the signature and a forwarded original", () => {
    expect(mailText("Zveme vás.\n-- \nJan Novák\n+420 777 000 000")).toBe("Zveme vás.");
    expect(mailText("Přeposílám.\n---------- Původní e-mail ----------\nOd: x")).toBe("Přeposílám.");
  });
});
