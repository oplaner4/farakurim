import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { issueId } from "@/lib/petrklic/issues";
import { readPetrklic } from "../add-petrklic";
import { stagePetrklic } from "./petrklic";
import { hasPoppler, pdfWithText, useStageFixture } from "../test-helpers";

describe.skipIf(!hasPoppler)("stagePetrklic", { timeout: 30_000 }, () => {
  const { env, download, uploaded } = useStageFixture();
  const firstId = () => issueId(readPetrklic(env.petrklicFile).issues[0]);

  it("stages the PDF with its cover and pages and adds the issue", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic", "Strana 2"]));
    const options = { source, year: 2099, number: 3, note: "Mimořádné" };
    expect(await stagePetrklic(env, { ...options, check: true })).toEqual({
      lines: [
        "Would stage uploads/petrklic/2099-3-mimoradne/ (PDF), 2 pages",
        "Would add 3/2099 (Mimořádné) (2 pages) at position 1 in src/content/petrklic.json (the current issue)",
      ],
      written: [],
    });
    expect(firstId()).not.toBe("2099-3-mimoradne");
    const result = await stagePetrklic(env, options);
    expect(result).toEqual({
      lines: [
        "Staged uploads/petrklic/2099-3-mimoradne/ (PDF, cover.webp, pages/), 2 pages",
        "Added 3/2099 (Mimořádné) (2 pages) at position 1 in src/content/petrklic.json (the current issue)",
      ],
      written: [env.petrklicFile],
    });
    expect(firstId()).toBe("2099-3-mimoradne");
    expect(readdirSync(uploaded("petrklic", "2099-3-mimoradne")).sort()).toEqual([
      "cover.webp",
      "pages",
      "petrklic-2099-3-mimoradne.pdf",
    ]);
    expect(readdirSync(uploaded("petrklic", "2099-3-mimoradne", "pages")).sort()).toEqual(["1.webp", "2.webp"]);
  });

  it("stops on an issue already there before copying anything", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic"]));
    const { year, number, note } = readPetrklic(env.petrklicFile).issues[0];
    await expect(stagePetrklic(env, { source, year, number, note })).rejects.toThrow(/is already in petrklic\.json/);
    expect(existsSync(env.uploadsDir) ? readdirSync(env.uploadsDir) : []).toEqual([]);
  });
});
