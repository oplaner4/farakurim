import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { links, SITE_URL } from "@/content/site";
import { ROOT } from "./content-files";
import { LIVE } from "./server-files.mjs";
import { workflowEnv } from "./test-helpers";

// The site's address is SITE_URL; the shell scripts, the workflows and the plain-Node servers cannot import it, so
// they keep a copy.
describe("the copies of SITE_URL", () => {
  it("is SITE in scripts/deploy.sh", () => {
    const deployScript = readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8");
    expect(/^SITE=(\S+)$/m.exec(deployScript)?.[1]).toBe(SITE_URL);
  });

  it.each(["deploy.yml", "service-sheet-release.yml"])("is SITE in %s", (file) => {
    expect(workflowEnv(file, "SITE")).toBe(SITE_URL);
  });

  it("is LIVE in scripts/lib/server-files.mjs", () => {
    expect(LIVE).toBe(SITE_URL);
  });
});

describe("the copy of links.services", () => {
  it("is SERVICES_PAGE in service-sheet-release.yml", () => {
    expect(workflowEnv("service-sheet-release.yml", "SERVICES_PAGE")).toBe(links.services);
  });
});
