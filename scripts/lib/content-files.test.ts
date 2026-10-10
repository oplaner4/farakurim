import { describe, expect, it } from "vitest";
import { NEWS_DIR, newsIds } from "./content-files";

describe("newsIds", () => {
  it("reads the ID of every aktualita in the news folder", () => {
    const ids = newsIds(NEWS_DIR);
    expect(ids.has("jubileum-800-2026")).toBe(true);
    expect(ids.has("trikralova-sbirka-2020")).toBe(true);
    expect([...ids].every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });
});
