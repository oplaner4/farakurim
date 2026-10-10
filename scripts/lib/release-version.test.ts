import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { nextVersion, releaseBump } from "./release-version";

describe("releaseBump", () => {
  it("is minor when a feature is among the commits", () => {
    expect(releaseBump(["fix(news): keep the poster ratio", "feat(mass): support two-week ohlášky"])).toBe("minor");
    expect(releaseBump(["feat: add the Kronika page"])).toBe("minor");
    expect(releaseBump(["feat!: drop the old URLs"])).toBe("minor");
    expect(releaseBump(["feat(news)!: change the detail URLs"])).toBe("minor");
  });

  it("is a patch for content features and everything else", () => {
    expect(releaseBump(["feat(content): add the Drakiáda aktualita"])).toBe("patch");
    expect(releaseBump(["feat(content)!: rename the album ids"])).toBe("patch");
    expect(releaseBump(["fix(carousel): keep the slide aligned", "chore(deps): update next", "docs: readme"])).toBe(
      "patch",
    );
    expect(releaseBump([])).toBe("patch");
  });

  it("only counts a feat type at the start of the subject", () => {
    expect(releaseBump(["feature: not a type"])).toBe("patch");
    expect(releaseBump(["fix: a feat: inside the subject"])).toBe("patch");
    expect(releaseBump(['Revert "feat(news): add filters"'])).toBe("patch");
    expect(releaseBump(["feat (news): space before the scope"])).toBe("patch");
  });

  it("treats a scope that only starts with content as a feature", () => {
    expect(releaseBump(["feat(content-skills): stage posters as WebP"])).toBe("minor");
  });

  it("is major only on request", () => {
    expect(releaseBump(["fix: typo"], { major: true })).toBe("major");
  });
});

describe("nextVersion", () => {
  it("raises one part and resets the lower ones", () => {
    expect(nextVersion("1.1.0", "patch")).toBe("1.1.1");
    expect(nextVersion("1.1.9", "minor")).toBe("1.2.0");
    expect(nextVersion("1.9.3", "major")).toBe("2.0.0");
    expect(nextVersion("1.9.10", "patch")).toBe("1.9.11");
  });

  it("refuses anything but a plain release version", () => {
    expect(() => nextVersion("1.2", "patch")).toThrow("Not a release version");
    expect(() => nextVersion("1.2.0-beta.1", "patch")).toThrow("Not a release version");
  });
});

// Each call starts Node, slower than the unit tests when the whole suite runs.
describe("command line", { timeout: 30_000 }, () => {
  const script = fileURLToPath(new URL("../release-version.ts", import.meta.url));
  const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
    version: string;
  };
  // The entry point, with tsx as scripts/release.sh runs it, loaded into Node directly (no pnpm start per call).
  const run = (input: string, ...args: string[]) =>
    execFileSync(process.execPath, ["--import", "tsx", script, ...args], { input, encoding: "utf8" });

  it("prints the bump and the version for package.json", () => {
    expect(run("fix: a\nfeat(news): b\n")).toBe(`minor ${nextVersion(version, "minor")}\n`);
    expect(run("feat(content): a\n")).toBe(`patch ${nextVersion(version, "patch")}\n`);
    expect(run("fix: a\n", "--major")).toBe(`major ${nextVersion(version, "major")}\n`);
  });
});
