import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePetrklicId, stagePetrklic } from "./petrklic";
import { hasPoppler, pdfWithText, useStageFixture } from "../test-helpers";

describe("parsePetrklicId", () => {
  it("takes the year and number, with an optional note", () => {
    expect(parsePetrklicId("2026-2")).toEqual({ year: 2026, number: 2 });
    expect(parsePetrklicId("2026-3-mimoradne")).toEqual({ year: 2026, number: 3 });
    expect(() => parsePetrklicId("26-2")).toThrow("is not <year>-<number>");
  });
});

describe.skipIf(!hasPoppler)("stagePetrklic", { timeout: 30_000 }, () => {
  const { env, download, uploaded } = useStageFixture();

  it("stages the PDF with its cover and pages and prints the issue line", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic", "Strana 2"]));
    expect(await stagePetrklic(env, { source, id: "2026-3", note: "Mimořádné", check: true })).toEqual([
      "Would stage uploads/petrklic/2026-3/ (PDF), 2 pages",
      '  issue("2026-3", 2026, 3, 2, { note: "Mimořádné" }),',
    ]);
    expect(await stagePetrklic(env, { source, id: "2026-3" })).toEqual([
      "Staged uploads/petrklic/2026-3/ (PDF, cover.webp, pages/), 2 pages",
      '  issue("2026-3", 2026, 3, 2),',
    ]);
    expect(readdirSync(uploaded("petrklic", "2026-3")).sort()).toEqual(["cover.webp", "pages", "petrklic-2026-3.pdf"]);
    expect(readdirSync(uploaded("petrklic", "2026-3", "pages")).sort()).toEqual(["1.webp", "2.webp"]);
  });
});
