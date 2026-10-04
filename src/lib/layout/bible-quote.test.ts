import { describe, expect, it } from "vitest";
import { parseQuoteJson, parseViraQuote } from "./bible-quote";

// The widget's response as vira.cz sends it.
const widget = `
			<div id="biblicky-citat">
			<div id="biblicky-citat-na-dnesni-den">Biblick&yacute; cit&aacute;t na dne&scaron;n&iacute; den</div>
			<span id="biblicky-citat-text">Boží pokoj uchrání
			vaše &bdquo;srdce&ldquo;.</span>
			<span id="biblicky-citat-citace">(Fp 4,7)</span>
			<div id="biblicky-citat-odkaz"><a href="https://www.vira.cz/" id="biblicky-citat-odkaz-a">www.vira.cz</a>
			</div>
			</div>`;

describe("parseViraQuote", () => {
  it("reads the verse and the reference without brackets", () => {
    expect(parseViraQuote(widget, "2026-10-04")).toEqual({
      date: "2026-10-04",
      text: "Boží pokoj uchrání vaše „srdce“.",
      reference: "Fp 4,7",
    });
  });

  it("strips markup inside the verse", () => {
    const html = widget.replace("Boží pokoj", "<b>Boží</b> pokoj");
    expect(parseViraQuote(html, "2026-10-04")?.text).toMatch(/^Boží pokoj/);
  });

  it("gives nothing for a page without the verse", () => {
    expect(parseViraQuote("<html>Chyba 500</html>", "2026-10-04")).toBeUndefined();
    expect(parseViraQuote(widget.replace("(Fp 4,7)", ""), "2026-10-04")).toBeUndefined();
  });
});

describe("parseQuoteJson", () => {
  it("accepts the proxy's quote", () => {
    const quote = { date: "2026-10-05", text: "Pane, nauč nás modlit se.", reference: "Lk 11,1" };
    expect(parseQuoteJson(quote)).toEqual(quote);
  });

  it("rejects anything else", () => {
    expect(parseQuoteJson(null)).toBeUndefined();
    expect(parseQuoteJson("<?php")).toBeUndefined();
    expect(parseQuoteJson({})).toBeUndefined();
    expect(parseQuoteJson({ date: "dnes", text: "x", reference: "y" })).toBeUndefined();
    expect(parseQuoteJson({ date: "2026-10-05", text: "", reference: "y" })).toBeUndefined();
  });
});
