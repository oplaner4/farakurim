import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../content-files";
import { siteFromDeployScript, sourceFile } from "./core";
import { useStageFixture } from "../test-helpers";

describe("siteFromDeployScript", () => {
  it("reads SITE from scripts/deploy.sh", () => {
    expect(siteFromDeployScript(readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8"))).toMatch(/^https:\/\/\S+$/);
    expect(() => siteFromDeployScript("TARGET=x")).toThrow("no SITE");
  });
});

describe("sourceFile", () => {
  const { env, download } = useStageFixture();

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
