import { describe, expect, it } from "vitest";
import { NEWS_DIR, newsIds, toSource } from "./content-files";

describe("toSource", () => {
  it("writes upload paths with the UPLOADS constant", () => {
    expect(toSource("/uploads/aktuality/hody-ceska-plakat.webp")).toBe("`${UPLOADS}/hody-ceska-plakat.webp`");
    expect(toSource("/uploads/petrklic/1/cover.webp")).toBe('"/uploads/petrklic/1/cover.webp"');
    expect(toSource("https://example.cz/uploads/aktuality/x.pdf")).toBe('"https://example.cz/uploads/aktuality/x.pdf"');
  });

  it("escapes text and keeps Czech letters", () => {
    expect(toSource('Zveme na „hody“ – a "koncert"\n')).toBe('"Zveme na „hody“ – a \\"koncert\\"\\n"');
  });

  it("writes nested values", () => {
    expect(toSource({ program: [{ time: "9:30", title: "Mše" }], longTerm: { weeklyAt: "18:30" }, sessions: 4 })).toBe(
      '{ program: [{ time: "9:30", title: "Mše" }], longTerm: { weeklyAt: "18:30" }, sessions: 4 }',
    );
    expect(toSource({ longTerm: true, pinned: true })).toBe("{ longTerm: true, pinned: true }");
  });
});

describe("newsIds", () => {
  it("reads the ID of every aktualita in the news folder", () => {
    const ids = newsIds(NEWS_DIR);
    expect(ids.has("jubileum-800-2026")).toBe(true);
    expect([...ids].every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });
});
