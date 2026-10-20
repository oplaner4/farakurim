import { describe, expect, it } from "vitest";
import { UPLOADS_PATH } from "@/lib/shared/uploads";
import { UPLOADS_PATH as SERVED_UPLOADS_PATH } from "./server-files.mjs";

// The plain-Node servers cannot import UPLOADS_PATH, so they keep a copy.
describe("the copy of UPLOADS_PATH", () => {
  it("is UPLOADS_PATH in scripts/lib/server-files.mjs", () => {
    expect(SERVED_UPLOADS_PATH).toBe(UPLOADS_PATH);
  });
});
