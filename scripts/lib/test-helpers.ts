// Fixtures for the script tests.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import sharp from "sharp";
import { afterEach, beforeEach, vi } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { EXCEPTIONS_FILE, NEWS_DIR, SERVICE_SHEETS_FILE, PETRKLIC_FILE } from "./content-files";
import type { StageEnv } from "./stage/core";
import { UPLOADS_DIR } from "./uploads";

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

/** Whether LibreOffice is installed; the DOCX conversion tests skip without it. */
export const hasSoffice = !spawnSync("soffice", ["--version"]).error;

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** WordprocessingML for the DOCX fixtures: a run, a paragraph of runs and a table of cells of paragraphs. */
export const wordml = {
  run: (text: string, { bold = false, italic = false } = {}) =>
    `<w:r>${bold || italic ? `<w:rPr>${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`,
  /** A paragraph of runs; a plain string is one run. */
  p: (...runs: string[]) => `<w:p>${runs.map((r) => (r.startsWith("<w:") ? r : wordml.run(r))).join("")}</w:p>`,
  /** A table: rows of cells, each cell its lines as paragraphs. */
  table: (rows: string[][][]) =>
    `<w:tbl>${rows
      .map(
        (cells) =>
          `<w:tr>${cells.map((lines) => `<w:tc>${(lines.length ? lines : [""]).map((l) => wordml.p(l)).join("")}</w:tc>`).join("")}</w:tr>`,
      )
      .join("")}</w:tbl>`,
};

/** A DOCX whose body is `body` (WordprocessingML), with external links by relationship id. */
export function docxWithBody(body: string, links: Record<string, string> = {}): Buffer {
  const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const rels = Object.entries(links)
    .map(
      ([id, url]) =>
        `<Relationship Id="${id}" Type="${r}/hyperlink" Target="${escapeXml(url)}" TargetMode="External"/>`,
    )
    .join("");
  const xml = (text: string) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${text}`);
  return Buffer.from(
    zipSync({
      "[Content_Types].xml": xml(
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      ),
      "_rels/.rels": xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${r}/officeDocument" Target="word/document.xml"/></Relationships>`,
      ),
      "word/_rels/document.xml.rels": xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
      ),
      "word/document.xml": xml(`<w:document xmlns:w="${w}" xmlns:r="${r}"><w:body>${body}</w:body></w:document>`),
    }),
  );
}

/**
 * A temp news folder holding only `months` (`"<year>/<MM>.json"` → records), fresh for each test; `dir()` is its
 * path. For the tests that must not depend on the real records (which event is pinned).
 */
export function useNewsFixture(months: Record<string, NewsEvent[]>) {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "news-"));
    for (const [file, list] of Object.entries(months)) {
      mkdirSync(join(dir, file.slice(0, 4)), { recursive: true });
      writeFileSync(join(dir, file), `${JSON.stringify(list, null, 2)}\n`);
    }
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  return { dir: () => dir };
}

/**
 * A temp uploads/, news/, service-sheets.json, schedule-exceptions.json, petrklic.json and home for the `pnpm stage` tests, fresh for each test: `env`
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
    cpSync(SERVICE_SHEETS_FILE, join(dir, "service-sheets.json"));
    cpSync(EXCEPTIONS_FILE, join(dir, "schedule-exceptions.json"));
    cpSync(PETRKLIC_FILE, join(dir, "petrklic.json"));
    fetchMock.mockReset();
    status(404);
    Object.assign(env, {
      uploadsDir: join(dir, UPLOADS_DIR),
      newsDir: join(dir, "news"),
      serviceSheetsFile: join(dir, "service-sheets.json"),
      exceptionsFile: join(dir, "schedule-exceptions.json"),
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
