import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  labelSuffix,
  parsePetrklicId,
  parseWeek,
  runCommand,
  siteFromDeployScript,
  sourceFile,
  stageAktualita,
  stagePetrklic,
  stagePorad,
  type StageEnv,
  weekDays,
} from "./stage-upload";
import { hasPoppler, pdfWithText } from "./test-helpers";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("labelSuffix", () => {
  it("turns any label into an ASCII kebab-case suffix", () => {
    expect(labelSuffix("Plakát")).toBe("plakat");
    expect(labelSuffix("Oznámení")).toBe("oznameni");
    expect(labelSuffix("Mapka trasy")).toBe("mapka-trasy");
    expect(labelSuffix("Petrklíč 1/2020")).toBe("petrklic-1-2020");
    expect(() => labelSuffix("–")).toThrow('the label "–" has no letters or digits');
  });
});

describe("siteFromDeployScript", () => {
  it("reads SITE from scripts/deploy.sh", () => {
    expect(siteFromDeployScript(readFileSync(join(root, "scripts/deploy.sh"), "utf8"))).toMatch(/^https:\/\/\S+$/);
    expect(() => siteFromDeployScript("TARGET=x")).toThrow("no SITE");
  });
});

describe("parseWeek", () => {
  it("reads the week from the heading", () => {
    expect(parseWeek("POŘAD BOHOSLUŽEB od 4. 10. 2026 do 11. 10. 2026")).toEqual({
      validFrom: "2026-10-04",
      validTo: "2026-10-11",
    });
    expect(parseWeek("Od 4.10.2026\n do 11.10.2026")).toEqual({ validFrom: "2026-10-04", validTo: "2026-10-11" });
  });

  it("takes the first year from the second one, across New Year too", () => {
    expect(parseWeek("od 30. 11. do 7. 12. 2025")).toEqual({ validFrom: "2025-11-30", validTo: "2025-12-07" });
    expect(parseWeek("od 28. 12. do 4. 1. 2026")).toEqual({ validFrom: "2025-12-28", validTo: "2026-01-04" });
  });

  it("is null without a heading and refuses a day that does not exist", () => {
    expect(parseWeek("Pořad bohoslužeb")).toBeNull();
    expect(() => parseWeek("od 30. 2. 2026 do 7. 3. 2026")).toThrow("30. 2. 2026 is not a date");
  });
});

describe("weekDays", () => {
  it("lists every day with its Czech weekday", () => {
    const days = weekDays("2026-10-04", "2026-10-11");
    expect(days).toHaveLength(8);
    expect(days.slice(0, 2)).toEqual(["ne 2026-10-04", "po 2026-10-05"]);
    expect(days.at(-1)).toBe("ne 2026-10-11");
  });
});

describe("parsePetrklicId", () => {
  it("takes the year and number, with an optional note", () => {
    expect(parsePetrklicId("2026-2")).toEqual({ year: 2026, number: 2 });
    expect(parsePetrklicId("2026-3-mimoradne")).toEqual({ year: 2026, number: 3 });
    expect(() => parsePetrklicId("26-2")).toThrow("is not <year>-<number>");
  });
});

describe("on a temp uploads/, news/ and home", { timeout: 30_000 }, () => {
  let dir: string;
  let env: StageEnv;
  let fetchMock: ReturnType<typeof vi.fn>;
  const status = (code: number) => fetchMock.mockResolvedValue(new Response(null, { status: code }));
  const uploaded = (...rel: string[]) => join(dir, "uploads", ...rel);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "stage-upload-"));
    mkdirSync(join(dir, "home", "Downloads"), { recursive: true });
    cpSync(join(root, "src/content/news"), join(dir, "news"), { recursive: true });
    fetchMock = vi.fn();
    status(404);
    env = {
      uploadsDir: join(dir, "uploads"),
      newsDir: join(dir, "news"),
      site: "https://example.cz",
      fetch: fetchMock as unknown as typeof fetch,
      home: join(dir, "home"),
    };
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** A poster image in ~/Downloads/. */
  const poster = async (name = "Plakát akce.jpg", width = 1000) => {
    await sharp({ create: { width, height: 1414, channels: 3, background: { r: 200, g: 30, b: 90 } } })
      .jpeg()
      .toFile(join(dir, "home", "Downloads", name));
    return name;
  };
  const download = (name: string, content: Buffer | string) => {
    writeFileSync(join(dir, "home", "Downloads", name), content);
    return name;
  };

  describe("sourceFile", () => {
    it("finds a bare name in ~/Downloads/ and expands ~", () => {
      download("a.pdf", "x");
      expect(sourceFile("a.pdf", 1, env.home)).toBe(join(env.home, "Downloads", "a.pdf"));
      expect(sourceFile("~/Downloads/a.pdf", 1, env.home)).toBe(join(env.home, "Downloads", "a.pdf"));
      expect(() => sourceFile("b.pdf", 1, env.home)).toThrow("b.pdf not found (also looked in ~/Downloads/)");
    });

    it("refuses a file over the limit", () => {
      download("big.pdf", Buffer.alloc(1024 * 1024 + 1));
      expect(() => sourceFile("big.pdf", 1, env.home)).toThrow("big.pdf is 1.0 MB, over 1 MB");
    });
  });

  describe("stageAktualita", () => {
    it("with check only prints the lines, after asking the server", async () => {
      const source = await poster();
      const { lines, written } = await stageAktualita(env, {
        source,
        id: "hody-ceska",
        label: "Plakát",
        title: "Hody v České",
        check: true,
      });
      const size = readFileSync(join(env.home, "Downloads", source)).length;
      expect(lines).toEqual([
        "Would stage uploads/aktuality/hody-ceska-plakat.jpg and .webp",
        '    poster: { src: `${UPLOADS}/hody-ceska-plakat.webp`, alt: "Plakát: Hody v České" },',
        `    attachments: [{ label: "Plakát", file: \`\${UPLOADS}/hody-ceska-plakat.jpg\`, size: ${size} }],`,
      ]);
      expect(written).toEqual([]);
      expect(existsSync(uploaded())).toBe(false);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.cz/uploads/aktuality/hody-ceska-plakat.jpg",
        expect.objectContaining({ method: "HEAD" }),
      );
    });

    it("copies the file under its ASCII name and renders the poster", async () => {
      const source = await poster("Plakát.JPEG");
      const { lines } = await stageAktualita(env, { source, id: "hody-ceska", label: "Plakát" });
      expect(lines[0]).toBe("Staged uploads/aktuality/hody-ceska-plakat.jpg and .webp");
      expect(readdirSync(uploaded("aktuality")).sort()).toEqual(["hody-ceska-plakat.jpg", "hody-ceska-plakat.webp"]);
      expect((await sharp(readFileSync(uploaded("aktuality", "hody-ceska-plakat.webp"))).metadata()).width).toBe(680);

      // The same file again is fine, another one under the same name is not.
      await stageAktualita(env, { source, id: "hody-ceska", label: "Plakát" });
      const other = await poster("jiny.jpg", 900);
      await expect(stageAktualita(env, { source: other, id: "hody-ceska", label: "Plakát" })).rejects.toThrow(
        "uploads/aktuality/hody-ceska-plakat.jpg is already staged with other content",
      );
    });

    it("takes any label, and renders no poster for audio or video or with poster: false", async () => {
      const source = await poster();
      const { lines } = await stageAktualita(env, { source, id: "a", label: " Mapka trasy ", check: true });
      expect(lines[0]).toBe("Would stage uploads/aktuality/a-mapka-trasy.jpg and .webp");
      expect(lines.at(-1)).toContain('attachments: [{ label: "Mapka trasy", file: `${UPLOADS}/a-mapka-trasy.jpg`');
      const audio = download("koncert.mp3", "x");
      expect((await stageAktualita(env, { source: audio, id: "b", label: "Záznam koncertu" })).lines[0]).toBe(
        "Staged uploads/aktuality/b-zaznam-koncertu.mp3",
      );
      await stageAktualita(env, { source, id: "c", label: "Informace", poster: false });
      expect(readdirSync(uploaded("aktuality")).sort()).toEqual(["b-zaznam-koncertu.mp3", "c-informace.jpg"]);
    });

    it("refuses a bad id, label or file type", async () => {
      const source = await poster();
      const stageAs = (options: { id?: string; label?: string; source?: string; poster?: boolean }) =>
        stageAktualita(env, { source, id: "hody", label: "Plakát", check: true, ...options });
      await expect(stageAs({ id: "Hody-České" })).rejects.toThrow('"Hody-České" is not an ASCII kebab-case id');
      await expect(stageAs({ label: " " })).rejects.toThrow('the label "" has no letters or digits');
      await expect(stageAs({ source: download("a.txt", "x") })).rejects.toThrow(".txt is not an image");
      await expect(stageAs({ source: download("a.mp3", "x"), poster: true })).rejects.toThrow(
        "a .mp3 file cannot be a poster: pass --no-poster",
      );
    });

    it("refuses a name the server has, and stops when it cannot tell", async () => {
      const source = await poster();
      const stageIt = () => stageAktualita(env, { source, id: "hody", label: "Plakát" });
      status(200);
      await expect(stageIt()).rejects.toThrow("hody-plakat.jpg already exists on the server: pick another id");
      status(500);
      await expect(stageIt()).rejects.toThrow("answered 500: cannot tell whether the name is free");
      fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
      await expect(stageIt()).rejects.toThrow("cannot reach https://example.cz (getaddrinfo ENOTFOUND)");
      expect(existsSync(uploaded())).toBe(false);
    });

    const record = {
      id: "test-hody",
      title: "Hody v České",
      start: "2026-10-20",
      place: "Česká",
      text: "Srdečně zveme na tradiční hody.",
    };

    it("adds the record with the poster and attachment", async () => {
      const source = await poster();
      const options = { source, id: "test-hody", label: "Plakát", record };
      expect((await stageAktualita(env, { ...options, check: true })).lines[0]).toBe(
        "Would add the record to src/content/news/2026/10.ts",
      );
      const { lines, written } = await stageAktualita(env, {
        ...options,
        record: { ...record, poster: { alt: "Plakát: Hody v České 20. října" } },
      });
      expect(lines).toEqual([
        "Staged uploads/aktuality/test-hody-plakat.jpg and .webp",
        "Added the record to src/content/news/2026/10.ts",
      ]);
      expect(written).toEqual(["2026/10.ts"]);
      const month = readFileSync(join(env.newsDir, "2026/10.ts"), "utf8");
      expect(month).toContain('id: "test-hody",');
      expect(month).toContain(
        'poster: { src: `${UPLOADS}/test-hody-plakat.webp`, alt: "Plakát: Hody v České 20. října" }',
      );
      expect(month).toContain('attachments: [{ label: "Plakát", file: `${UPLOADS}/test-hody-plakat.jpg`, size: ');
    });

    it("stages nothing for a record it refuses", async () => {
      const source = await poster();
      await expect(
        stageAktualita(env, { source, id: "test-hody", label: "Plakát", record: { ...record, id: "jine" } }),
      ).rejects.toThrow('the record\'s id "jine" is not "test-hody"');
      await expect(
        stageAktualita(env, { source, id: "test-hody", label: "Plakát", record: { ...record, start: "20. 10." } }),
      ).rejects.toThrow("the record is not valid");
      expect(existsSync(uploaded())).toBe(false);
    });
  });

  describe("stagePorad", () => {
    it("stages the PDF of the given week and lists its days", async () => {
      const source = download("porad.pdf", "%PDF");
      const lines = await stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-10-11" });
      expect(lines).toEqual([
        "Staged uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",
        '  pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",\n  validFrom: "2026-10-04",\n  validTo: "2026-10-11",',
        `days: ${weekDays("2026-10-04", "2026-10-11").join(", ")}`,
      ]);
      expect(existsSync(uploaded("porady_bohosluzeb", "2026-10-04-porad-bohosluzeb.pdf"))).toBe(true);
    });

    it("names a corrected PDF and hints at it when the week is published", async () => {
      const source = download("porad.pdf", "%PDF");
      const week = { source, validFrom: "2026-10-04", validTo: "2026-10-11", check: true };
      expect((await stagePorad(env, { ...week, rev: 2 }))[0]).toBe(
        "Would stage uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-2.pdf",
      );
      status(200);
      await expect(stagePorad(env, week)).rejects.toThrow("for a corrected PDF pass --rev 2");
    });

    it("refuses a period that is not one or two weeks, and a file that is not a PDF", async () => {
      const source = download("porad.pdf", "%PDF");
      await expect(stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-11-04" })).rejects.toThrow(
        "the period 2026-10-04 – 2026-11-04 looks wrong",
      );
      await expect(stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-10-32" })).rejects.toThrow(
        "32. 10. 2026 is not a date",
      );
      await expect(stagePorad(env, { source: download("porad.docx", "x") })).rejects.toThrow("is a PDF");
    });

    it.skipIf(!hasPoppler)("reads the week from the PDF heading", async () => {
      const source = download("porad.pdf", pdfWithText(["Porad bohosluzeb od 4. 10. do 11. 10. 2026"]));
      expect((await stagePorad(env, { source, check: true }))[1]).toContain('validFrom: "2026-10-04"');
      const blank = download("prazdny.pdf", pdfWithText(["Farnost Kurim"]));
      await expect(stagePorad(env, { source: blank })).rejects.toThrow("no 'od … do …' week");
    });
  });

  describe.skipIf(!hasPoppler)("stagePetrklic", () => {
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
      expect(readdirSync(uploaded("petrklic", "2026-3")).sort()).toEqual([
        "cover.webp",
        "pages",
        "petrklic-2026-3.pdf",
      ]);
      expect(readdirSync(uploaded("petrklic", "2026-3", "pages")).sort()).toEqual(["1.webp", "2.webp"]);
    });
  });

  describe("runCommand", () => {
    it("parses each command's arguments", async () => {
      const source = download("porad.pdf", "%PDF");
      const { lines } = await runCommand(env, [
        "porad",
        source,
        "--from",
        "2026-10-04",
        "--to",
        "2026-10-11",
        "--rev",
        "3",
        "--check",
      ]);
      expect(lines[0]).toBe("Would stage uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-3.pdf");

      const recordFile = join(dir, "record.json");
      writeFileSync(recordFile, JSON.stringify({ id: "x", title: "T", start: "2026-10-20", place: "P", text: "T" }));
      const aktualita = await runCommand(env, [
        "aktualita",
        await poster(),
        "x",
        "Leták",
        "--no-poster",
        "--record",
        recordFile,
        "--check",
      ]);
      expect(aktualita.lines).toEqual([
        "Would add the record to src/content/news/2026/10.ts",
        "Would stage uploads/aktuality/x-letak.jpg",
      ]);
    });

    it("refuses missing arguments, another command's options and a bad --rev", async () => {
      await expect(runCommand(env, ["aktualita", "a.jpg", "x"])).rejects.toThrow("wrong arguments\nUsage: pnpm stage");
      await expect(runCommand(env, [])).rejects.toThrow(
        /Largest source file: aktualita \d+ MB, porad \d+ MB, petrklic \d+ MB/,
      );
      await expect(runCommand(env, ["petrklic", "a.pdf", "2026-1", "--rev", "2"])).rejects.toThrow("wrong arguments");
      await expect(runCommand(env, ["tisk", "a.pdf"])).rejects.toThrow("wrong arguments");
      await expect(runCommand(env, ["porad", "a.pdf", "--rev", "1"])).rejects.toThrow("--rev is a number from 2");
    });
  });
});
