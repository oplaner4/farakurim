import { describe, expect, it } from "vitest";
import type { NativitySeason } from "@/content/types/nativity";
import { at } from "@/test/fixtures";
import { statusPanel } from "./status";

const season = {
  year: 2026,
  openingDays: [
    { date: "2026-12-19", from: "14:00", to: "17:00" },
    { date: "2026-12-27", from: "14:00", to: "17:00" },
    { date: "2027-01-01", from: "14:00", to: "17:00" },
    { date: "2027-01-03", from: "14:00", to: "17:00" },
  ],
} as NativitySeason;

describe("statusPanel", () => {
  it("counts down to the opening", () => {
    expect(statusPanel(season, at("2026-11-28"))).toEqual({
      state: "before",
      pill: { text: "Výstava začne za 21 dní", open: false },
      title: ["Zahájení v sobotu", "19. prosince ve 14:00"],
      text: "Kostel sv. Maří Magdalény a fara v Kuřimi. Otevřeno 4 dny, poslední den v neděli 3. ledna.",
    });
    expect(statusPanel(season, at("2026-12-18")).pill.text).toBe("Výstava začne zítra");
  });

  it("is open now within today's hours, with the next day", () => {
    expect(statusPanel(season, at("2026-12-27", "15:00"))).toEqual({
      state: "during",
      pill: { text: "Právě otevřeno", open: true },
      title: ["Dnes otevřeno", "14:00–17:00"],
      text: "Neděle 27. prosince · kostel a fara. Příště v pátek 1. ledna 14:00–17:00.",
    });
  });

  it("gives today's opening time before it opens, and says so on the last day", () => {
    const panel = statusPanel(season, at("2027-01-03", "10:00"));
    expect(panel.pill).toEqual({ text: "Dnes otevíráme ve 14:00", open: false });
    expect(panel.text).toBe("Neděle 3. ledna · kostel a fara. Dnes je poslední den výstavy.");
  });

  it("gives the next opening day on a closed day", () => {
    expect(statusPanel(season, at("2026-12-28"))).toEqual({
      state: "during",
      pill: { text: "Dnes zavřeno", open: false },
      title: ["Příště otevřeno", "v pátek 1. ledna 14:00–17:00"],
      text: "Kostel sv. Maří Magdalény a fara v Kuřimi. Poslední den v neděli 3. ledna.",
    });
  });

  it("thanks the visitors once the last day's hours are over", () => {
    expect(statusPanel(season, at("2027-01-03", "17:00")).state).toBe("after");
    expect(statusPanel(season, at("2027-02-01"))).toEqual({
      state: "after",
      pill: { text: "Výstava 2026 skončila", open: false },
      title: ["Děkujeme za návštěvu!"],
      text: "Děkujeme všem dětem, vystavovatelům a dobrovolníkům. Další výstava bude v prosinci 2027.",
    });
  });
});
