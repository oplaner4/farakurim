import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { issueId } from "@/lib/petrklic/issues";
import { readPetrklic } from "../petrklic/add-petrklic";
import { stagePetrklic } from "./petrklic";
import { hasPoppler, pdfWithText, useStageFixture } from "../test-helpers";

// renderPetrklic renders for real unless a test makes it fail once.
const render = vi.hoisted(() => ({ fail: false }));
vi.mock("../images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../images")>();
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

  it("moves an unreleased issue to its new id and removes its old folder", async () => {
    await stagePetrklic(env, { source: download("Petrklic.pdf", pdfWithText(["Petrklic"])), year: 2099, number: 1 });
    const check = await stagePetrklic(env, { from: "2099-1", year: 2099, number: 2, check: true });
    expect(check.lines).toEqual([
      "Would stage uploads/petrklic/2099-2/ (PDF), 1 pages",
      "Would replace 2099-1 with 2/2099 (1 pages) at position 1 in src/content/petrklic.json (the current issue)",
      "Would remove the unreleased old folder uploads/petrklic/2099-1/",
    ]);
    expect(firstId()).toBe("2099-1");
    const result = await stagePetrklic(env, { from: "2099-1", year: 2099, number: 2 });
    expect(result.lines[0]).toBe("Staged uploads/petrklic/2099-2/ (PDF, cover.webp, pages/), 1 pages");
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual({ year: 2099, number: 2, pageCount: 1 });
    expect(readPetrklic(env.petrklicFile).issues.some((issue) => issueId(issue) === "2099-1")).toBe(false);
    expect(readdirSync(uploaded("petrklic"))).toEqual(["2099-2"]);
    expect(readdirSync(uploaded("petrklic", "2099-2")).sort()).toEqual(["cover.webp", "pages", "petrklic-2099-2.pdf"]);
  });

  it("moves a released issue from the site's PDF, sorted again, and names the redirects to the old PDF", async () => {
    const issues = readPetrklic(env.petrklicFile).issues;
    const current = issues[0];
    const id = issueId(current);
    const old = `/uploads/petrklic/${id}/petrklic-${id}.pdf`;
    const pdf = pdfWithText(["Petrklic", "Strana 2"]);
    writeFileSync(env.htaccessFile, `# Redirects\nRewriteRule ^a$ ${old} [R=301,L]\nRewriteRule ^b$ /other.pdf\n`);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith(old) ? new Response(new Uint8Array(pdf), { status: 200 }) : new Response(null, { status: 404 }),
    );
    const result = await stagePetrklic(env, { from: id, year: 2006, number: 9 });
    const position = readPetrklic(env.petrklicFile).issues.findIndex((issue) => issueId(issue) === "2006-9") + 1;
    expect(position).toBeGreaterThan(1);
    expect(result.lines).toEqual([
      "Staged uploads/petrklic/2006-9/ (PDF, cover.webp, pages/), 2 pages",
      `Replaced ${id} with 9/2006 (2 pages) at position ${position} in src/content/petrklic.json (not the current issue: newer issues come first)`,
      `The old folder https://example.cz/uploads/petrklic/${id}/ stays online: files on the server are never deleted`,
      `public/.htaccess redirects to the old PDF on line 2: change ${old} to /uploads/petrklic/2006-9/petrklic-2006-9.pdf there`,
    ]);
    expect(readPetrklic(env.petrklicFile).issues[position - 1]).toEqual({ year: 2006, number: 9, pageCount: 2 });
    expect(readPetrklic(env.petrklicFile).issues[0]).toEqual(issues[1]);
    expect(readFileSync(uploaded("petrklic", "2006-9", "petrklic-2006-9.pdf")).equals(Buffer.from(pdf))).toBe(true);
    expect(readdirSync(uploaded("petrklic"))).toEqual(["2006-9"]);
  });

  it("refuses a move that keeps the id, of an issue not there, or with a source or --corrected", async () => {
    const { year, number, note } = readPetrklic(env.petrklicFile).issues[0];
    const id = firstId();
    await expect(stagePetrklic(env, { from: "2099-1", year: 2099, number: 2 })).rejects.toThrow(
      "the issue 2099-1 is not in petrklic.json",
    );
    await expect(stagePetrklic(env, { from: id, year, number, note })).rejects.toThrow(/keeps its id/);
    await expect(stagePetrklic(env, { from: id, year: 2099, number: 2, corrected: true })).rejects.toThrow(
      "no source and no --corrected",
    );
    await expect(stagePetrklic(env, { from: id, year: 2099, number: 2 })).rejects.toThrow(
      "is neither staged nor on the server",
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
