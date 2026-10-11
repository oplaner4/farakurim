import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./content-files";
import { siteFromDeployScript } from "./uploads";

describe("siteFromDeployScript", () => {
  it("reads SITE from scripts/deploy.sh", () => {
    expect(siteFromDeployScript(readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8"))).toMatch(/^https:\/\/\S+$/);
    expect(() => siteFromDeployScript("TARGET=x")).toThrow("no SITE");
  });
});
