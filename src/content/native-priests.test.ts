import { describe, expect, it } from "vitest";
import { nativePriests } from "./native-priests";
import { duplicates, localHrefs, UPLOAD } from "@/lib/test/content-checks";

describe("Kněží – rodáci (native-priests.ts)", () => {
  it("names each priest once and links files under /uploads/", () => {
    expect(duplicates(nativePriests.map((p) => p.name))).toEqual([]);
    const hrefs = nativePriests.flatMap((p) => localHrefs(p.html ?? ""));
    expect(hrefs.filter((href) => !UPLOAD.test(href))).toEqual([]);
  });
});
