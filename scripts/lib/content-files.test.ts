import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentRestorePoint, NEWS_DIR, newsIds, withContentRestore } from "./content-files";
import { freshTempDir } from "./test-helpers";

describe("newsIds", () => {
  it("reads the ID of every event in the news folder", () => {
    const ids = newsIds(NEWS_DIR);
    expect(ids.has("jubileum-800-2026")).toBe(true);
    expect(ids.has("trikralova-sbirka-2020")).toBe(true);
    expect([...ids].every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });
});

describe("contentRestorePoint", () => {
  const tmp = freshTempDir("content-restore");
  const dirs = () => ({ content: join(tmp(), "content"), uploads: join(tmp(), "uploads") });
  const seed = () => {
    const { content, uploads } = dirs();
    mkdirSync(join(content, "news/2026"), { recursive: true });
    mkdirSync(join(uploads, "aktuality"), { recursive: true });
    writeFileSync(join(content, "news/2026/10.json"), "old");
    writeFileSync(join(content, "gallery.json"), "gallery");
    writeFileSync(join(uploads, "aktuality/a.pdf"), "pdf");
  };

  it("restores changed and deleted content files and removes new ones", () => {
    seed();
    const { content, uploads } = dirs();
    const restore = contentRestorePoint(content, uploads);
    writeFileSync(join(content, "news/2026/10.json"), "new");
    rmSync(join(content, "gallery.json"));
    writeFileSync(join(content, "news/2026/11.json"), "added");
    restore();
    expect(readFileSync(join(content, "news/2026/10.json"), "utf8")).toBe("old");
    expect(readFileSync(join(content, "gallery.json"), "utf8")).toBe("gallery");
    expect(existsSync(join(content, "news/2026/11.json"))).toBe(false);
  });

  it("removes the files staged after the restore point, keeping the older ones", () => {
    seed();
    const { content, uploads } = dirs();
    const restore = contentRestorePoint(content, uploads);
    writeFileSync(join(uploads, "aktuality/b.pdf"), "staged");
    restore();
    expect(existsSync(join(uploads, "aktuality/a.pdf"))).toBe(true);
    expect(existsSync(join(uploads, "aktuality/b.pdf"))).toBe(false);
  });
});

describe("withContentRestore", () => {
  const tmp = freshTempDir("content-restore-run");
  const setup = () => {
    const content = join(tmp(), "content");
    mkdirSync(join(content, "news/2026"), { recursive: true });
    writeFileSync(join(content, "news/2026/10.json"), "old");
    return { content, uploads: join(tmp(), "uploads"), added: join(content, "news/2026/11.json") };
  };

  it("restores and rethrows when the command throws, and keeps the change when it succeeds", async () => {
    const { content, uploads, added } = setup();
    const failing = withContentRestore(
      () => {
        writeFileSync(added, "added");
        throw new Error("tests failed");
      },
      { content, uploads },
    );
    await expect(failing(undefined)).rejects.toThrow("tests failed");
    expect(existsSync(added)).toBe(false);

    const succeeding = withContentRestore(() => writeFileSync(added, "added"), { content, uploads });
    await succeeding(undefined);
    expect(existsSync(added)).toBe(true);
  });
});
