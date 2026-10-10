import { describe, expect, it } from "vitest";
import * as z from "zod";
import { MAX_ALBUMS } from "@/lib/gallery/albums";
import { albumSchema, galleryFileSchema } from "@/lib/gallery/schema";
import { albums } from "./gallery";
import data from "./gallery.json";

const problems = (result: z.ZodSafeParseResult<unknown>) => (result.success ? "" : z.prettifyError(result.error));

describe("Fotogalerie (gallery.json)", () => {
  it.each(data.albums.map((album) => [album.id, album] as const))("album %s matches the schema", (_, album) => {
    expect(problems(albumSchema.safeParse(album))).toBe("");
  });

  it("has unique albums, newest first", () => {
    expect(problems(galleryFileSchema.safeParse(data))).toBe("");
  });

  it(`keeps at most ${MAX_ALBUMS} albums (pnpm add-album removes the older ones)`, () => {
    expect(albums.length).toBeLessThanOrEqual(MAX_ALBUMS);
  });
});
