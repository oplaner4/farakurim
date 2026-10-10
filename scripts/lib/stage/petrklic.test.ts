import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { issueId } from "@/lib/petrklic/issues";
import { readPetrklic } from "../petrklic/add-petrklic";
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
  const { env, download, uploaded, fetchMock } = useStageFixture();
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

  it("stages a released issue's corrected PDF in the next rev's folder, then replaces it there", async () => {
    const current = readPetrklic(env.petrklicFile).issues[0];
    const id = issueId(current);
    const { year, number, note } = current;
    // Only the issue's first PDF is on the server.
    fetchMock.mockImplementation(async (url: string) => {
      const released = url.endsWith(`/uploads/petrklic/${id}/petrklic-${id}.pdf`);
      return new Response(null, { status: released ? 200 : 404 });
    });
    const source = download("Petrklic oprava.pdf", pdfWithText(["Petrklic", "Strana 2", "Strana 3"]));
    await expect(stagePetrklic(env, { source, year, number, note })).rejects.toThrow("pass --corrected");
    const result = await stagePetrklic(env, { source, year, number, note, corrected: true });
    expect(result.lines[0]).toBe(`Staged uploads/petrklic/${id}-r2/ (PDF, cover.webp, pages/), 3 pages`);
    expect(result.lines[1]).toMatch(/^Replaced .* with rev 2 \(3 pages\) at position 1 /);
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual({ ...current, rev: 2, pageCount: 3 });
    expect(readdirSync(uploaded("petrklic", `${id}-r2`)).sort()).toEqual(["cover.webp", "pages", `petrklic-${id}.pdf`]);

    // Corrected again before the release: rev 2 is not on the server yet, so its folder is replaced.
    const again = download("Petrklic oprava 2.pdf", pdfWithText(["Petrklic", "Strana 2"]));
    await stagePetrklic(env, { source: again, year, number, note, corrected: true });
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual({ ...current, rev: 2, pageCount: 2 });
    expect(readdirSync(uploaded("petrklic", `${id}-r2`, "pages")).sort()).toEqual(["1.webp", "2.webp"]);
    expect(readdirSync(uploaded("petrklic")).sort()).toEqual([`${id}-r2`]);
  });

  it("replaces an unreleased issue's PDF in its folder, without a rev", async () => {
    await stagePetrklic(env, { source: download("Petrklic.pdf", pdfWithText(["Petrklic"])), year: 2099, number: 1 });
    const source = download("Petrklic oprava.pdf", pdfWithText(["Petrklic", "Strana 2"]));
    const check = await stagePetrklic(env, { source, year: 2099, number: 1, corrected: true, check: true });
    expect(check.lines).toEqual([
      "Would stage uploads/petrklic/2099-1/ (PDF), 2 pages",
      "Would replace 1/2099 (2 pages) at position 1 in src/content/petrklic.json (the current issue)",
    ]);
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual({ year: 2099, number: 1, pageCount: 1 });
    await stagePetrklic(env, { source, year: 2099, number: 1, corrected: true });
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual({ year: 2099, number: 1, pageCount: 2 });
    expect(readdirSync(uploaded("petrklic", "2099-1", "pages")).sort()).toEqual(["1.webp", "2.webp"]);
  });

  it("refuses --corrected for an issue not in petrklic.json", async () => {
    const source = download("Petrklic.pdf", pdfWithText(["Petrklic"]));
    await expect(stagePetrklic(env, { source, year: 2099, number: 1, corrected: true })).rejects.toThrow(
      "the issue 2099-1 is not in petrklic.json",
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
