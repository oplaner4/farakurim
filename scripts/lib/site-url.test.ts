import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/content/site";
import { ROOT } from "./content-files";
import { LIVE } from "./server-files.mjs";

// The site's address is SITE_URL; the shell scripts and the plain-Node servers cannot import it, so they keep a copy.
describe("the copies of SITE_URL", () => {
  it("is SITE in scripts/deploy.sh, which scripts/release.sh reads too", () => {
    const deployScript = readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8");
    expect(/^SITE=(\S+)$/m.exec(deployScript)?.[1]).toBe(SITE_URL);
  });

  it("is LIVE in scripts/lib/server-files.mjs", () => {
    expect(LIVE).toBe(SITE_URL);
  });
});
