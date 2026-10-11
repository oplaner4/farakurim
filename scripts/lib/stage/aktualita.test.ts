import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readEvents, readMonth } from "@/content/news";
import { addAktualita } from "../news/add-aktualita";
import {
  type AktualitaFile,
  type AktualitaOptions,
  fileRev,
  labelSuffix,
  stageAktualita,
  withAttachment,
} from "./aktualita";
import { POSTER_WIDTH } from "../images";
import { pdfWithText, useStageFixture } from "../test-helpers";

describe("labelSuffix", () => {
  it("turns any label into an ASCII kebab-case suffix", () => {
    expect(labelSuffix("Plakát")).toBe("plakat");
    expect(labelSuffix("Oznámení")).toBe("oznameni");
    expect(labelSuffix("Mapka trasy")).toBe("mapka-trasy");
    expect(labelSuffix("Petrklíč 1/2020")).toBe("petrklic-1-2020");
    expect(() => labelSuffix("–")).toThrow('the label "–" has no letters or digits');
  });
});

describe("fileRev", () => {
  it("reads the rev of a corrected file", () => {
    expect(fileRev("/uploads/aktuality/hody-2026-plakat.pdf")).toBeUndefined();
    expect(fileRev("/uploads/aktuality/hody-2026-plakat-r2.pdf")).toBe(2);
    expect(fileRev("/uploads/aktuality/hody-2026-plakat-r12.webp")).toBe(12);
  });
});

describe("withAttachment", () => {
  const plakat = { label: "Plakát", file: "/uploads/aktuality/a-plakat.pdf" };
  const program = { label: "Program", file: "/uploads/aktuality/a-program.pdf" };
  it("replaces the attachment with the same label, else adds it", () => {
    const corrected = { label: "Plakát", file: "/uploads/aktuality/a-plakat-r2.pdf" };
    expect(withAttachment([plakat, program], corrected)).toEqual([corrected, program]);
    expect(withAttachment([plakat], program)).toEqual([plakat, program]);
    expect(withAttachment([], plakat)).toEqual([plakat]);
  });
});

describe("stageAktualita", { timeout: 30_000 }, () => {
  const { env, fetchMock, status, download, uploaded, poster } = useStageFixture();
  /** Stages one file, `source` under `label`. */
  const stageOne = ({ source, label, ...rest }: Omit<AktualitaOptions, "files"> & AktualitaFile) =>
    stageAktualita(env, { ...rest, files: [{ source, label }] });

  const record = {
    id: "test-hody-2026",
    title: "Hody v České",
    start: "2026-10-20",
    place: "Česká",
    text: "Srdečně zveme na tradiční hody.",
  };
  /** The record of `id`, so the file can be staged. */
  const recordOf = (id: string) => ({ ...record, id });

  it("with check only prints the line, after asking the server", async () => {
    const source = await poster();
    const { lines, written } = await stageOne({ source, id: "hody-ceska", label: "Plakát", check: true });
    expect(lines).toEqual(["Would stage uploads/aktuality/hody-ceska-plakat.jpg and its -poster.webp"]);
    expect(written).toEqual([]);
    expect(existsSync(uploaded())).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.cz/uploads/aktuality/hody-ceska-plakat.jpg",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("stages nothing without a record, except with check", async () => {
    const source = await poster();
    await expect(stageOne({ source, id: "hody-ceska", label: "Plakát" })).rejects.toThrow(
      "--record is required to stage the files; without it, only --check",
    );
    expect(existsSync(uploaded())).toBe(false);
  });

  it("copies the file under its ASCII name and renders the poster", async () => {
    const source = await poster("Plakát.JPEG");
    const id = "test-hody-2026";
    const { lines } = await stageOne({ source, id, label: "Plakát", record: recordOf(id) });
    expect(lines[0]).toBe("Staged uploads/aktuality/test-hody-2026-plakat.jpg and its -poster.webp");
    expect(readdirSync(uploaded("aktuality")).sort()).toEqual([
      "test-hody-2026-plakat-poster.webp",
      "test-hody-2026-plakat.jpg",
    ]);
    expect(
      (await sharp(readFileSync(uploaded("aktuality", "test-hody-2026-plakat-poster.webp"))).metadata()).width,
    ).toBe(POSTER_WIDTH);

    // The same file again is fine, another one under the same name is not.
    await stageOne({ source, id, label: "Plakát", check: true });
    const other = await poster("jiny.jpg", 900);
    await expect(stageOne({ source: other, id, label: "Plakát", check: true })).rejects.toThrow(
      "uploads/aktuality/test-hody-2026-plakat.jpg is already staged with other content",
    );
  });

  it("keeps a WebP source as it is, next to its poster", async () => {
    const jpg = await poster("plakat.jpg", 2000);
    const source = download(
      "Plakát.webp",
      await sharp(join(env.home, "Downloads", jpg))
        .webp()
        .toBuffer(),
    );
    const original = readFileSync(join(env.home, "Downloads", source));
    const id = "test-hody-2026";
    await stageOne({ source, id, label: "Plakát", record: recordOf(id) });
    expect(readdirSync(uploaded("aktuality")).sort()).toEqual([
      "test-hody-2026-plakat-poster.webp",
      "test-hody-2026-plakat.webp",
    ]);
    expect(readFileSync(uploaded("aktuality", "test-hody-2026-plakat.webp"))).toEqual(original);
    expect(
      (await sharp(readFileSync(uploaded("aktuality", "test-hody-2026-plakat-poster.webp"))).metadata()).width,
    ).toBe(POSTER_WIDTH);
  });

  it("takes any label, and renders no poster for an MP3 or with noPoster", async () => {
    const source = await poster();
    const { lines } = await stageOne({ source, id: "a", label: " Mapka trasy ", check: true });
    expect(lines).toEqual(["Would stage uploads/aktuality/a-mapka-trasy.jpg and its -poster.webp"]);
    const audio = download("koncert.mp3", "x");
    const b = "test-koncert-2026";
    expect((await stageOne({ source: audio, id: b, label: "Záznam koncertu", record: recordOf(b) })).lines[0]).toBe(
      "Staged uploads/aktuality/test-koncert-2026-zaznam-koncertu.mp3",
    );
    const c = "test-informace-2026";
    await stageOne({ source, id: c, label: "Informace", noPoster: true, record: recordOf(c) });
    expect(readdirSync(uploaded("aktuality")).sort()).toEqual([
      "test-informace-2026-informace.jpg",
      "test-koncert-2026-zaznam-koncertu.mp3",
    ]);
  });

  it("refuses a bad id, label or file type", async () => {
    const source = await poster();
    const stageAs = (options: { id?: string; label?: string; source?: string }) =>
      stageOne({ source, id: "hody", label: "Plakát", check: true, ...options });
    await expect(stageAs({ id: "Hody-České" })).rejects.toThrow('"Hody-České" is not an ASCII kebab-case id');
    await expect(stageAs({ label: " " })).rejects.toThrow('the label "" has no letters or digits');
    await expect(stageAs({ source: download("a.txt", "x") })).rejects.toThrow(".txt is not a file an aktualita links");
    await expect(stageAs({ source: download("a.mp4", "x") })).rejects.toThrow(".mp4 is not a file an aktualita links");
  });

  it("refuses a name the server has, and stops when it cannot tell", async () => {
    const source = await poster();
    const stageIt = () => stageOne({ source, id: "hody", label: "Plakát", check: true });
    status(200);
    await expect(stageIt()).rejects.toThrow("hody-plakat.jpg already exists on the server: pick another id");
    status(500);
    await expect(stageIt()).rejects.toThrow("answered 500: cannot tell whether the name is free");
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    await expect(stageIt()).rejects.toThrow("cannot reach https://example.cz (getaddrinfo ENOTFOUND)");
    expect(existsSync(uploaded())).toBe(false);
  });

  it("adds the record with the poster and attachment", async () => {
    const source = await poster();
    const options = { source, id: "test-hody-2026", label: "Plakát", record };
    expect((await stageOne({ ...options, check: true })).lines[0]).toBe(
      "Would add the record to src/content/news/2026/10.json",
    );
    const { lines, written } = await stageOne({
      ...options,
      record: { ...record, poster: { alt: "Plakát: Hody v České 20. října" } },
    });
    expect(lines).toEqual([
      "Staged uploads/aktuality/test-hody-2026-plakat.jpg and its -poster.webp",
      "Added the record to src/content/news/2026/10.json",
    ]);
    expect(written).toEqual(["2026/10.json"]);
    const added = readMonth(env.newsDir, "2026/10.json").find((e) => e.id === "test-hody-2026");
    expect(added?.poster).toEqual({
      src: "/uploads/aktuality/test-hody-2026-plakat-poster.webp",
      alt: "Plakát: Hody v České 20. října",
    });
    expect(added?.attachments).toEqual([
      { label: "Plakát", file: "/uploads/aktuality/test-hody-2026-plakat.jpg", size: expect.any(Number) },
    ]);
  });

  it("moves the pin to a pinned record and names the record it unpins", async () => {
    // A known pinned record far ahead, whatever the real records pin.
    const before = { ...record, id: "test-pinned-2098", start: "2098-10-20", pinned: true };
    addAktualita(env.newsDir, before);
    const source = await poster();
    const options = {
      source,
      id: "test-hody-2099",
      label: "Plakát",
      record: { ...record, id: "test-hody-2099", start: "2099-10-20", pinned: true },
    };
    expect((await stageOne({ ...options, check: true })).lines).toEqual([
      "Would add the record to src/content/news/2099/10.json (new file)",
      "Would unpin test-pinned-2098 (Hody v České)",
      "Would stage uploads/aktuality/test-hody-2099-plakat.jpg and its -poster.webp",
    ]);
    const { lines, written } = await stageOne(options);
    expect(lines.slice(1)).toEqual([
      "Added the record to src/content/news/2099/10.json (new file)",
      "Unpinned test-pinned-2098 (Hody v České)",
    ]);
    expect(written).toEqual(["2099/10.json", "2098/10.json"]);
    expect(
      readEvents(env.newsDir)
        .filter((e) => e.pinned)
        .map((e) => e.id),
    ).toEqual(["test-hody-2099"]);
  });

  it("stages nothing for a record it refuses", async () => {
    const source = await poster();
    await expect(
      stageOne({ source, id: "test-hody-2026", label: "Plakát", record: { ...record, id: "jine" } }),
    ).rejects.toThrow('the record\'s id "jine" is not "test-hody-2026"');
    await expect(
      stageOne({ source, id: "test-hody-2026", label: "Plakát", record: { ...record, start: "20. 10." } }),
    ).rejects.toThrow("the record is not valid");
    await expect(
      stageOne({
        source,
        id: "test-stare-2020",
        label: "Plakát",
        record: { ...record, id: "test-stare-2020", start: "2020-10-20", pinned: true },
      }),
    ).rejects.toThrow("cannot pin test-stare-2020: it ended on 2020-10-20");
    expect(existsSync(uploaded())).toBe(false);
  });

  describe("with corrected", () => {
    const staged = {
      ...record,
      poster: { src: "/uploads/aktuality/test-hody-2026-plakat-poster.webp", alt: "Plakát: Hody 20. října" },
    };
    const add = async () => {
      const source = await poster();
      await stageOne({ source, id: "test-hody-2026", label: "Plakát", record: staged });
    };
    const added = () => readEvents(env.newsDir).find((e) => e.id === "test-hody-2026");

    it("refuses an aktualita that is not on the site", async () => {
      const source = await poster();
      await expect(
        stageOne({ source, id: "test-nic-2026", label: "Plakát", corrected: true, check: true }),
      ).rejects.toThrow("there is no aktualita test-nic-2026: --corrected is for one already on the site");
    });

    it("replaces the staged file before the release, keeping the poster's alt", async () => {
      await add();
      const other = await poster("opraveny.jpg", 900);
      const options = { source: other, id: "test-hody-2026", label: "Plakát", corrected: true };
      expect((await stageOne({ ...options, check: true })).lines).toEqual([
        "Would replace the record in src/content/news/2026/10.json",
        "Changed: attachments",
        "Would stage uploads/aktuality/test-hody-2026-plakat.jpg and its -poster.webp",
      ]);
      const { lines, written, event } = await stageOne(options);
      expect(lines.slice(1)).toEqual(["Replaced the record in src/content/news/2026/10.json", "Changed: attachments"]);
      expect(written).toEqual(["2026/10.json"]);
      expect(event?.id).toBe("test-hody-2026");
      expect(readFileSync(uploaded("aktuality", "test-hody-2026-plakat.jpg"))).toEqual(
        readFileSync(join(env.home, "Downloads", other)),
      );
      expect(added()?.poster).toEqual(staged.poster);
      expect(added()?.attachments).toEqual([
        { label: "Plakát", file: "/uploads/aktuality/test-hody-2026-plakat.jpg", size: expect.any(Number) },
      ]);
    });

    it("names the file -r2 once it is on the server, then -r3", async () => {
      await add();
      fetchMock.mockImplementation(async (url: string) => new Response(null, { status: /-r\d/.test(url) ? 404 : 200 }));
      const source = await poster("opraveny.jpg", 900);
      const options = { source, id: "test-hody-2026", label: "Plakát", corrected: true };
      expect((await stageOne(options)).lines[0]).toBe(
        "Staged uploads/aktuality/test-hody-2026-plakat-r2.jpg and its -poster.webp",
      );
      expect(added()?.poster?.src).toBe("/uploads/aktuality/test-hody-2026-plakat-r2-poster.webp");
      fetchMock.mockImplementation(async (url: string) => new Response(null, { status: /-r3/.test(url) ? 404 : 200 }));
      expect((await stageOne(options)).lines[0]).toBe(
        "Staged uploads/aktuality/test-hody-2026-plakat-r3.jpg and its -poster.webp",
      );
    });

    it("adds a file with a new label and takes the corrected record", async () => {
      await add();
      const program = download("program.mp3", "x");
      const { lines } = await stageOne({
        source: program,
        id: "test-hody-2026",
        label: "Záznam",
        corrected: true,
        record: { ...added(), time: "18:00" },
      });
      expect(lines).toContain("Changed: attachments, time");
      expect(added()?.attachments?.map((a) => a.label)).toEqual(["Plakát", "Záznam"]);
      expect(added()?.published).toBeDefined();
    });
  });

  describe("with several files", () => {
    const id = "test-farni-den-2026";
    const files = async () => [
      { source: await poster("plakat.jpg"), label: "Plakát" },
      { source: download("program.pdf", pdfWithText(["Program"])), label: "Program" },
      { source: download("trasa.mp3", "x"), label: "Mapka trasy" },
    ];
    const added = () => readEvents(env.newsDir).find((e) => e.id === id);

    it("stages each file in order, with the poster from the first", async () => {
      const { lines } = await stageAktualita(env, { id, files: await files(), record: recordOf(id) });
      expect(lines.slice(0, 3)).toEqual([
        "Staged uploads/aktuality/test-farni-den-2026-plakat.jpg and its -poster.webp",
        "Staged uploads/aktuality/test-farni-den-2026-program.pdf",
        "Staged uploads/aktuality/test-farni-den-2026-mapka-trasy.mp3",
      ]);
      expect(added()?.attachments?.map((a) => a.file)).toEqual([
        "/uploads/aktuality/test-farni-den-2026-plakat.jpg",
        "/uploads/aktuality/test-farni-den-2026-program.pdf",
        "/uploads/aktuality/test-farni-den-2026-mapka-trasy.mp3",
      ]);
      expect(added()?.poster).toEqual({
        src: "/uploads/aktuality/test-farni-den-2026-plakat-poster.webp",
        alt: "Plakát: Hody v České",
      });
    });

    it("takes no poster with noPoster or when the first file is not an image or PDF", async () => {
      const [plakat, program, trasa] = await files();
      const noPoster = await stageAktualita(env, { id, files: [plakat, program], noPoster: true, check: true });
      expect(noPoster.lines).toEqual([
        "Would stage uploads/aktuality/test-farni-den-2026-plakat.jpg",
        "Would stage uploads/aktuality/test-farni-den-2026-program.pdf",
      ]);
      const audioFirst = await stageAktualita(env, { id, files: [trasa, plakat], check: true });
      expect(audioFirst.lines.every((line) => !line.includes("poster"))).toBe(true);
    });

    it("stages nothing when a label repeats a file name or a later name is taken", async () => {
      const [plakat, program] = await files();
      await expect(
        stageAktualita(env, { id, files: [plakat, { ...program, label: "Plakat" }], record: recordOf(id) }),
      ).rejects.toThrow('the labels "Plakát" and "Plakat" give the same file name (test-farni-den-2026-plakat)');
      fetchMock.mockImplementation(
        async (url: string) => new Response(null, { status: url.endsWith(".pdf") ? 200 : 404 }),
      );
      await expect(stageAktualita(env, { id, files: [plakat, program], record: recordOf(id) })).rejects.toThrow(
        "test-farni-den-2026-program.pdf already exists on the server",
      );
      expect(existsSync(uploaded())).toBe(false);
      expect(added()).toBeUndefined();
    });

    it("with corrected changes the poster only with its file", async () => {
      const [plakat, program] = await files();
      await stageAktualita(env, { id, files: [plakat, program], record: recordOf(id) });
      const before = added()?.poster;
      // Released: every name of the first version is on the server.
      fetchMock.mockImplementation(async (url: string) => new Response(null, { status: /-r\d/.test(url) ? 404 : 200 }));

      const newProgram = download("program2.pdf", pdfWithText(["Program 2"]));
      const { lines } = await stageAktualita(env, {
        id,
        files: [{ source: newProgram, label: "Program" }],
        corrected: true,
      });
      expect(lines).toContain("Staged uploads/aktuality/test-farni-den-2026-program-r2.pdf");
      expect(added()?.poster).toEqual(before);
      expect(added()?.attachments?.map((a) => a.label)).toEqual(["Plakát", "Program"]);

      const newPlakat = await poster("opraveny.jpg", 900);
      await stageAktualita(env, { id, files: [{ source: newPlakat, label: "Plakát" }], corrected: true });
      expect(added()?.poster).toEqual({
        ...before,
        src: "/uploads/aktuality/test-farni-den-2026-plakat-r2-poster.webp",
      });

      await expect(
        stageAktualita(env, { id, files: [{ source: newProgram, label: "Program" }], corrected: true, noPoster: true }),
      ).rejects.toThrow("--no-poster is for a new aktualita: pnpm poster-aktualita changes the poster");
    });

    it("with corrected refuses a label that differs from one in the record only in accents", async () => {
      const [plakat, program] = await files();
      await stageAktualita(env, { id, files: [plakat], record: recordOf(id) });
      const before = readdirSync(uploaded("aktuality")).sort();
      await expect(
        stageAktualita(env, { id, files: [{ ...program, label: "Plakat" }], corrected: true }),
      ).rejects.toThrow('must differ from "Plakát" in more than accents, case or punctuation');
      expect(readdirSync(uploaded("aktuality")).sort()).toEqual(before);
    });

    it("with corrected gives a record without a poster none", async () => {
      const [plakat, program] = await files();
      await stageAktualita(env, { id, files: [program], noPoster: true, record: recordOf(id) });
      const { lines } = await stageAktualita(env, { id, files: [plakat], corrected: true });
      expect(lines).toContain("Staged uploads/aktuality/test-farni-den-2026-plakat.jpg");
      expect(added()?.poster).toBeUndefined();
      expect(added()?.attachments?.map((a) => a.label)).toEqual(["Program", "Plakát"]);
    });
  });
});
