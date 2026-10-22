// Fixtures for the script tests.

import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { dkimSign } from "mailauth";
import sharp from "sharp";
import { afterEach, beforeEach, vi } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { periodDates } from "@/lib/services/service-sheet";
import { EXCEPTIONS_FILE, NEWS_DIR, ROOT, SERVICE_SHEETS_FILE, PETRKLIC_FILE } from "./content-files";
import type { Mailbox } from "./mail/imap";
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
  /** A table cell of `lines`, merged with the cells below it ("restart") or into the one above ("continue"). */
  cell: (lines: string[], merge?: "restart" | "continue") =>
    `<w:tc>${merge ? `<w:tcPr><w:vMerge${merge === "restart" ? ' w:val="restart"' : ""}/></w:tcPr>` : ""}${(lines.length ? lines : [""]).map((l) => wordml.p(l)).join("")}</w:tc>`,
  /** A table: rows of cells, each cell its lines as paragraphs, or a `cell()`. */
  table: (rows: (string[] | string)[][]) =>
    `<w:tbl>${rows
      .map((cells) => `<w:tr>${cells.map((c) => (typeof c === "string" ? c : wordml.cell(c))).join("")}</w:tr>`)
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

/** The value of `name` in the top-level `env:` of the workflow `file` (.github/workflows/<file>); undefined without it. */
export const workflowEnv = (file: string, name: string) =>
  new RegExp(`^env:\\n(?: {2}.*\\n)*? {2}${name}: (\\S+)$`, "m").exec(
    readFileSync(join(ROOT, ".github/workflows", file), "utf8"),
  )?.[1];

/** The days of a service sheet record from `validFrom` to `validTo`, all without services. */
export const emptyWeek = (validFrom: string, validTo: string) =>
  periodDates(validFrom, validTo).map((date) => ({ date, rows: [] }));

/** A temp folder for each test, created before it and removed after it; returns a getter of its path. */
export function freshTempDir(prefix: string): () => string {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  return () => dir;
}

/**
 * A temp news folder holding only `months` (`"<year>/<MM>.json"` → records), fresh for each test; `dir()` is its
 * path. For the tests that must not depend on the real records (which event is pinned).
 */
export function useNewsFixture(months: Record<string, NewsEvent[]>) {
  const dir = freshTempDir("news");
  beforeEach(() => {
    for (const [file, list] of Object.entries(months)) {
      mkdirSync(join(dir(), file.slice(0, 4)), { recursive: true });
      writeFileSync(join(dir(), file), `${JSON.stringify(list, null, 2)}\n`);
    }
  });
  return { dir };
}

/**
 * A temp staging folder, news/, service-sheets.json, schedule-exceptions.json, petrklic.json and home for the `pnpm stage` tests, fresh for each test: `env`
 * points there and asks a fetch stub that answers 404 (the name is free) until `status()` changes it.
 */
export function useStageFixture() {
  const fetchMock = vi.fn();
  const env = { fetch: fetchMock as unknown as typeof fetch, site: "https://example.cz" } as StageEnv;
  const tempDir = freshTempDir("stage");
  const status = (code: number) => fetchMock.mockResolvedValue(new Response(null, { status: code }));

  beforeEach(() => {
    const dir = tempDir();
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
    /** A path in the temp staging folder. */
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

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const publicKeyBody = publicKey.replace(/-----[A-Z ]+-----|\s/g, "");

/** A mailbox holding `messages`, whose `move` records its calls. */
export function fakeMailbox(messages: { uid: number; source: Buffer }[]) {
  const move = vi.fn<Mailbox["move"]>(async () => {});
  const mailbox: Mailbox = { unseen: async () => messages, move, close: async () => {} };
  return { mailbox, move };
}

/** A fake DNS: the `test` selector of every domain holds the test key. */
export const fakeDkimResolver = async (name: string, type: string): Promise<string[][]> => {
  if (type === "TXT" && /^test\._domainkey\./.test(name)) return [[`v=DKIM1; k=rsa; p=${publicKeyBody}`]];
  throw Object.assign(new Error(`no ${type} record for ${name}`), { code: "ENOTFOUND" });
};

/**
 * A plain MIME message from `from` with a base64 part per file (a name, whose content is "content of <name>", or a
 * name with its bytes), sent at `date`.
 */
export function mailMessage({
  from,
  files,
  headers = [],
  date = "Fri, 16 Oct 2026 08:00:00 +0000",
}: {
  from: string;
  files: (string | { name: string; content: Buffer })[];
  headers?: string[];
  date?: string;
}): Buffer {
  const boundary = "sheet-boundary";
  const parts = files.map((file) => {
    const { name, content } =
      typeof file === "string" ? { name: file, content: Buffer.from(`content of ${file}`) } : file;
    return [
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      content.toString("base64"),
    ].join("\r\n");
  });
  return Buffer.from(
    [
      `From: ${from}`,
      ...headers,
      "To: web@farakurim.cz",
      "Subject: Pořad bohoslužeb",
      `Date: ${date}`,
      "Message-ID: <sheet@example.test>",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      ...parts,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );
}

/** `raw` with one more DKIM signature of `domain` (the test key) in front. */
export async function dkimSigned(raw: Buffer, domain: string, maxBodyLength?: number): Promise<Buffer> {
  const { signatures, errors } = await dkimSign(raw, {
    signatureData: [{ signingDomain: domain, selector: "test", privateKey, maxBodyLength }],
  });
  if (errors.length) throw new Error("the test message could not be signed");
  return Buffer.concat([Buffer.from(signatures), raw]);
}
