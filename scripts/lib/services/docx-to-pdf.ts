// Converts a Word document to PDF: with Word on Windows (through PowerShell), else with LibreOffice, from the PATH or
// its usual install folder. Each converter lays the document out by itself, so their PDFs differ a little.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Opens the document read-only in a hidden Word and saves it as PDF (17 is wdExportFormatPDF). */
const WORD_SCRIPT = `$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($env:DOCX_SOURCE, $false, $true)
  try { $doc.ExportAsFixedFormat($env:DOCX_PDF, 17) } finally { $doc.Close(0) }
} finally { $word.Quit() }`;

/** The LibreOffice programs to try on `platform`: the one on the PATH, then the usual install folders. */
export function sofficeCandidates(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (platform === "win32") {
    const folders = [env.ProgramFiles ?? "C:\\Program Files", env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)"];
    return ["soffice", ...folders.map((folder) => `${folder}\\LibreOffice\\program\\soffice.exe`)];
  }
  if (platform === "darwin") return ["soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"];
  return ["soffice", "libreoffice"];
}

const TIMEOUT = 180_000;

/** Converts with Word; false when Word (or PowerShell) is not there or fails. */
function withWord(src: string, pdf: string) {
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WORD_SCRIPT], {
      env: { ...process.env, DOCX_SOURCE: src, DOCX_PDF: pdf },
      stdio: "pipe",
      timeout: TIMEOUT,
    });
    return existsSync(pdf);
  } catch {
    return false;
  }
}

/** Converts with LibreOffice; false when none of the programs is installed. */
function withLibreOffice(src: string, outDir: string, platform: NodeJS.Platform) {
  // Its own profile, so the conversion runs while LibreOffice is open, and leaves the user's profile alone.
  const profile = mkdtempSync(join(tmpdir(), "soffice-"));
  try {
    for (const program of sofficeCandidates(platform)) {
      try {
        execFileSync(
          program,
          [
            `-env:UserInstallation=${pathToFileURL(profile).href}`,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            outDir,
            src,
          ],
          { stdio: "pipe", timeout: TIMEOUT },
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw new Error(`LibreOffice could not convert ${basename(src)}: ${(error as Error).message}`);
      }
      return true;
    }
    return false;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

/** Converts the Word document `file` to a PDF in `dir` and returns its path; throws without Word or LibreOffice. */
export function docxToPdf(file: string, dir: string, platform: NodeJS.Platform = process.platform): string {
  // Word resolves a relative path from its own folder.
  const [src, outDir] = [resolve(file), resolve(dir)];
  const pdf = join(outDir, `${basename(src, extname(src))}.pdf`);
  if (platform === "win32" && withWord(src, pdf)) return pdf;
  if (!withLibreOffice(src, outDir, platform)) {
    throw new Error(
      `no converter for ${basename(src)}: install LibreOffice (or Word on Windows), or export the week's page as a PDF`,
    );
  }
  if (!existsSync(pdf)) throw new Error(`LibreOffice wrote no PDF for ${basename(src)}`);
  return pdf;
}
