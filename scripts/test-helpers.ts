// Fixtures for the script tests.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, vi } from "vitest";
import { NEWS_DIR, OHLASKY_FILE, PETRKLIC_FILE } from "./content-files";
import type { StageEnv } from "./stage/core";

/** Whether poppler's tools are installed; the PDF tests skip without them. */
export const hasPoppler = !spawnSync("pdfinfo", ["-v"]).error;

/** A minimal PDF (A4 pages, Helvetica) with one line of ASCII text per page. */
export function pdfWithText(pages: string[]): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + 2 * i} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((text, i) => {
    const content = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  });
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/**
 * A temp uploads/, news/, ohlasky.json, petrklic.json and home for the `pnpm stage` tests, fresh for each test: `env`
 * points there and asks a fetch stub that answers 404 (the name is free) until `status()` changes it.
 */
export function useStageFixture() {
  const fetchMock = vi.fn();
  const env = { fetch: fetchMock as unknown as typeof fetch, site: "https://example.cz" } as StageEnv;
  let dir = "";
  const status = (code: number) => fetchMock.mockResolvedValue(new Response(null, { status: code }));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "stage-"));
    mkdirSync(join(dir, "home", "Downloads"), { recursive: true });
    cpSync(NEWS_DIR, join(dir, "news"), { recursive: true });
    cpSync(OHLASKY_FILE, join(dir, "ohlasky.json"));
    cpSync(PETRKLIC_FILE, join(dir, "petrklic.json"));
    fetchMock.mockReset();
    status(404);
    Object.assign(env, {
      uploadsDir: join(dir, "uploads"),
      newsDir: join(dir, "news"),
      ohlaskyFile: join(dir, "ohlasky.json"),
      petrklicFile: join(dir, "petrklic.json"),
      home: join(dir, "home"),
    });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** A file in ~/Downloads/; returns its name. */
  const download = (name: string, content: Buffer | string) => {
    writeFileSync(join(env.home, "Downloads", name), content);
    return name;
  };

  return {
    env,
    fetchMock,
    status,
    download,
    /** A path in the temp uploads/. */
    uploaded: (...rel: string[]) => join(env.uploadsDir, ...rel),
    /** A poster image in ~/Downloads/; returns its name. */
    poster: async (name = "Plakát akce.jpg", width = 1000) => {
      await sharp({ create: { width, height: 1414, channels: 3, background: { r: 200, g: 30, b: 90 } } })
        .jpeg()
        .toFile(join(env.home, "Downloads", name));
      return name;
    },
  };
}
