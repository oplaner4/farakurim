import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { readMonth } from "@/content/news";
import { labelSuffix, stageAktualita } from "./aktualita";
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

  it("stages nothing for a record it refuses", async () => {
    const source = await poster();
    await expect(
      stageAktualita(env, { source, id: "test-hody-2026", label: "Plakát", record: { ...record, id: "jine" } }),
    ).rejects.toThrow('the record\'s id "jine" is not "test-hody-2026"');
    await expect(
      stageAktualita(env, { source, id: "test-hody-2026", label: "Plakát", record: { ...record, start: "20. 10." } }),
    ).rejects.toThrow("the record is not valid");
    expect(existsSync(uploaded())).toBe(false);
  });
});
