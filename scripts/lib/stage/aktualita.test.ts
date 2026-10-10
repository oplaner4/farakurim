import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readEvents, readMonth } from "@/content/news";
import { addAktualita } from "../news/add-aktualita";
import { fileRev, labelSuffix, stageAktualita, withAttachment } from "./aktualita";
import { POSTER_WIDTH } from "./images";
import { useStageFixture } from "../test-helpers";

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
      '"poster": {"src":"/uploads/aktuality/hody-ceska-plakat.webp","alt":"Plakát: Hody v České"},',
      `"attachments": [{"label":"Plakát","file":"/uploads/aktuality/hody-ceska-plakat.jpg","size":${size}}],`,
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
    expect((await sharp(readFileSync(uploaded("aktuality", "hody-ceska-plakat.webp"))).metadata()).width).toBe(
      POSTER_WIDTH,
    );

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
    expect(lines.at(-1)).toContain(
      '"attachments": [{"label":"Mapka trasy","file":"/uploads/aktuality/a-mapka-trasy.jpg"',
    );
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
    id: "test-hody-2026",
    title: "Hody v České",
    start: "2026-10-20",
    place: "Česká",
    text: "Srdečně zveme na tradiční hody.",
  };

  it("adds the record with the poster and attachment", async () => {
    const source = await poster();
    const options = { source, id: "test-hody-2026", label: "Plakát", record };
    expect((await stageAktualita(env, { ...options, check: true })).lines[0]).toBe(
      "Would add the record to src/content/news/2026/10.json",
    );
    const { lines, written } = await stageAktualita(env, {
      ...options,
      record: { ...record, poster: { alt: "Plakát: Hody v České 20. října" } },
    });
    expect(lines).toEqual([
      "Staged uploads/aktuality/test-hody-2026-plakat.jpg and .webp",
      "Added the record to src/content/news/2026/10.json",
    ]);
    expect(written).toEqual(["2026/10.json"]);
    const added = readMonth(env.newsDir, "2026/10.json").find((e) => e.id === "test-hody-2026");
    expect(added?.poster).toEqual({
      src: "/uploads/aktuality/test-hody-2026-plakat.webp",
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
    expect((await stageAktualita(env, { ...options, check: true })).lines).toEqual([
      "Would add the record to src/content/news/2099/10.json (new file)",
      "Would unpin test-pinned-2098 (Hody v České)",
      "Would stage uploads/aktuality/test-hody-2099-plakat.jpg and .webp",
    ]);
    const { lines, written } = await stageAktualita(env, options);
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
      stageAktualita(env, { source, id: "test-hody-2026", label: "Plakát", record: { ...record, id: "jine" } }),
    ).rejects.toThrow('the record\'s id "jine" is not "test-hody-2026"');
    await expect(
      stageAktualita(env, { source, id: "test-hody-2026", label: "Plakát", record: { ...record, start: "20. 10." } }),
    ).rejects.toThrow("the record is not valid");
    await expect(
      stageAktualita(env, {
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
      poster: { src: "/uploads/aktuality/test-hody-2026-plakat.webp", alt: "Plakát: Hody 20. října" },
    };
    const add = async () => {
      const source = await poster();
      await stageAktualita(env, { source, id: "test-hody-2026", label: "Plakát", record: staged });
    };
    const added = () => readEvents(env.newsDir).find((e) => e.id === "test-hody-2026");

    it("refuses an aktualita that is not on the site", async () => {
      const source = await poster();
      await expect(
        stageAktualita(env, { source, id: "test-nic-2026", label: "Plakát", corrected: true, check: true }),
      ).rejects.toThrow("there is no aktualita test-nic-2026: --corrected is for one already on the site");
    });

    it("replaces the staged file before the release, keeping the poster's alt", async () => {
      await add();
      const other = await poster("opraveny.jpg", 900);
      const options = { source: other, id: "test-hody-2026", label: "Plakát", corrected: true };
      expect((await stageAktualita(env, { ...options, check: true })).lines).toEqual([
        "Would replace the record in src/content/news/2026/10.json",
        "Changed: attachments",
        "Would stage uploads/aktuality/test-hody-2026-plakat.jpg and .webp",
      ]);
      const { lines, written, event } = await stageAktualita(env, options);
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
      expect((await stageAktualita(env, options)).lines[0]).toBe(
        "Staged uploads/aktuality/test-hody-2026-plakat-r2.jpg and .webp",
      );
      expect(added()?.poster?.src).toBe("/uploads/aktuality/test-hody-2026-plakat-r2.webp");
      fetchMock.mockImplementation(async (url: string) => new Response(null, { status: /-r3/.test(url) ? 404 : 200 }));
      expect((await stageAktualita(env, options)).lines[0]).toBe(
        "Staged uploads/aktuality/test-hody-2026-plakat-r3.jpg and .webp",
      );
    });

    it("adds a file with a new label and takes the corrected record", async () => {
      await add();
      const program = download("program.mp3", "x");
      const { lines } = await stageAktualita(env, {
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
});
