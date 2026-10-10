import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { issueId } from "@/lib/petrklic/issues";
import { readPetrklic } from "../add-petrklic";
import { stagePetrklic } from "./petrklic";
import { hasPoppler, pdfWithText, useStageFixture } from "../test-helpers";

// renderPetrklic renders for real unless a test makes it fail once.
const render = vi.hoisted(() => ({ fail: false }));
vi.mock("./images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./images")>();
  return {
    ...actual,
    renderPetrklic: async (...args: Parameters<typeof actual.renderPetrklic>) => {
      if (render.fail) throw new Error("pdftoppm failed");
      return actual.renderPetrklic(...args);
    },
  };
});

describe.skipIf(!hasPoppler)("stagePetrklic", { timeout: 30_000 }, () => {
  const { env, download, uploaded, status } = useStageFixture();
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

  it("stages a corrected PDF in the rev's folder and replaces the issue's record", async () => {
    const source = download("Petrklic oprava.pdf", pdfWithText(["Petrklic", "Strana 2", "Strana 3"]));
    const current = readPetrklic(env.petrklicFile).issues[0];
    const id = issueId(current);
    const { year, number, note } = current;
    // The first PDF is on the server, so staging it again under the same name is refused with the next rev.
    status(200);
    await expect(stagePetrklic(env, { source, year, number, note })).rejects.toThrow(/is already in petrklic\.json/);
    status(404);
    const result = await stagePetrklic(env, { source, year, number, note, rev: 2 });
    expect(result.lines[0]).toBe(`Staged uploads/petrklic/${id}-r2/ (PDF, cover.webp, pages/), 3 pages`);
    expect(result.lines[1]).toMatch(/^Replaced .* with rev 2 \(3 pages\) at position 1 /);
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual({ ...current, rev: 2, pageCount: 3 });
    expect(readdirSync(uploaded("petrklic", `${id}-r2`)).sort()).toEqual(["cover.webp", "pages", `petrklic-${id}.pdf`]);
    // rev 2 taken on the server: the hint names the next one.
    status(200);
    await expect(stagePetrklic(env, { source: "Petrklic oprava.pdf", year, number, note, rev: 2 })).rejects.toThrow(
      /uploads\/petrklic\/.*-r2\/petrklic-.*\.pdf already exists on the server: .*pass --rev 3/,
    );
  });

  it("removes the folder it staged when rendering fails, so no half issue goes out", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic"]));
    render.fail = true;
    try {
      await expect(stagePetrklic(env, { source, year: 2099, number: 1 })).rejects.toThrow("pdftoppm failed");
    } finally {
      render.fail = false;
    }
    expect(existsSync(uploaded("petrklic", "2099-1"))).toBe(false);
    expect(firstId()).not.toBe("2099-1");
  });
});
