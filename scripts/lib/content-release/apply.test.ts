import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { canSymlink, freshTempDir } from "../test-helpers";
import { applyArtifacts, missingLinks } from "./apply";
import type { ContentPull, ReleasePlan } from "./plan";

describe("applyArtifacts", () => {
  const dir = freshTempDir("content-release-apply");
  const from = () => join(dir(), "artifacts");
  const uploads = () => join(dir(), "uploads");

  function file(path: string, text = path) {
    const full = join(from(), path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }

  const pull = (number: number, kind: ContentPull["kind"], names: string[]): ContentPull => ({
    number,
    sha: `s${number}`,
    kind,
    branch: kind === "sheet" ? "service-sheet/x" : "events/x",
    page: "/",
    mergedAt: "2026-10-22T10:00:00Z",
    artifacts: names.map((name, i) => ({ name, runId: number * 100 + i })),
  });
  const release = (...pulls: ContentPull[]): ReleasePlan => ({ action: "release", pulls });
  const apply = (plan: ReleasePlan) => applyArtifacts({ plan, from: from(), uploads: uploads() });

  it("copies each artifact's tree into the uploads folder, in the plan's order", () => {
    file("content-uploads-a1/porady_bohosluzeb/x.pdf");
    file("content-uploads-b1/aktuality/y-plakat.pdf");
    const plan = release(pull(11, "sheet", ["content-uploads-a1"]), pull(12, "events", ["content-uploads-b1"]));
    expect(apply(plan)).toEqual(["porady_bohosluzeb/x.pdf", "aktuality/y-plakat.pdf"]);
    expect(readFileSync(join(uploads(), "aktuality/y-plakat.pdf"), "utf8")).toBe(
      "content-uploads-b1/aktuality/y-plakat.pdf",
    );
  });

  it("maps a legacy sheet artifact's PDFs into the sheets folder", () => {
    file("service-sheet-pdf-a1/x.pdf");
    expect(apply(release(pull(11, "sheet", ["service-sheet-pdf-a1"])))).toEqual(["porady_bohosluzeb/x.pdf"]);
    expect(existsSync(join(uploads(), "porady_bohosluzeb/x.pdf"))).toBe(true);
  });

  it("lets the later PR's file of the same path win", () => {
    file("content-uploads-a1/porady_bohosluzeb/x.pdf", "first");
    file("content-uploads-a2/porady_bohosluzeb/x.pdf", "second");
    apply(release(pull(11, "sheet", ["content-uploads-a1"]), pull(12, "sheet", ["content-uploads-a2"])));
    expect(readFileSync(join(uploads(), "porady_bohosluzeb/x.pdf"), "utf8")).toBe("second");
  });

  it.each<[string, () => ReleasePlan, string]>([
    [
      "another kind's folder in a sheet PR",
      () => (file("content-uploads-a1/aktuality/x.pdf"), release(pull(11, "sheet", ["content-uploads-a1"]))),
      "aktuality/x.pdf",
    ],
    [
      "another kind's folder in an events PR",
      () => (file("content-uploads-b1/porady_bohosluzeb/x.pdf"), release(pull(12, "events", ["content-uploads-b1"]))),
      "porady_bohosluzeb/x.pdf",
    ],
    [
      "a file the site cannot link",
      () => (file("content-uploads-a1/porady_bohosluzeb/x.php"), release(pull(11, "sheet", ["content-uploads-a1"]))),
      "x.php",
    ],
    [
      "a file at the artifact's root",
      () => (file("content-uploads-a1/x.pdf"), release(pull(11, "sheet", ["content-uploads-a1"]))),
      "x.pdf",
    ],
    [
      "a folder in a legacy artifact",
      () => (file("service-sheet-pdf-a1/sub/x.pdf"), release(pull(11, "sheet", ["service-sheet-pdf-a1"]))),
      "sub/x.pdf",
    ],
    [
      "a legacy artifact in an events PR",
      () => (file("service-sheet-pdf-b1/x.pdf"), release(pull(12, "events", ["service-sheet-pdf-b1"]))),
      "service-sheet-pdf-b1",
    ],
    [
      "an artifact name with a path",
      () => (file("x/porady_bohosluzeb/x.pdf"), release(pull(11, "sheet", ["content-uploads-a1/../x"]))),
      "content-uploads-a1/../x",
    ],
    ...(canSymlink
      ? ([
          [
            "a symlink",
            () => {
              file("outside.pdf");
              mkdirSync(join(from(), "content-uploads-a1/porady_bohosluzeb"), { recursive: true });
              symlinkSync(join(from(), "outside.pdf"), join(from(), "content-uploads-a1/porady_bohosluzeb/x.pdf"));
              return release(pull(11, "sheet", ["content-uploads-a1"]));
            },
            "x.pdf",
          ],
        ] satisfies [string, () => ReleasePlan, string][])
      : []),
  ])("refuses %s and copies nothing", (_, setup, named) => {
    file("content-uploads-0ff/porady_bohosluzeb/ok.pdf");
    const plan = setup();
    if (plan.action === "release") plan.pulls.unshift(pull(10, "sheet", ["content-uploads-0ff"]));
    expect(() => apply(plan)).toThrow(named);
    expect(existsSync(uploads())).toBe(false);
  });

  it("fails when an artifact of the plan was not downloaded", () => {
    expect(() => apply(release(pull(11, "sheet", ["content-uploads-a1"])))).toThrow("content-uploads-a1");
  });

  it("applies a blocked plan's artifacts, for a release by hand", () => {
    file("content-uploads-a1/porady_bohosluzeb/x.pdf");
    const plan: ReleasePlan = { action: "blocked", reason: "x", pulls: [pull(11, "sheet", ["content-uploads-a1"])] };
    expect(apply(plan)).toEqual(["porady_bohosluzeb/x.pdf"]);
  });

  it("copies nothing for a plan that releases nothing", () => {
    expect(apply({ action: "none", reason: "x" })).toEqual([]);
  });
});

describe("missingLinks", () => {
  const pull = (number: number, sha: string): ContentPull => ({
    number,
    sha,
    kind: "events",
    branch: "events/x",
    page: "/aktuality/",
    mergedAt: "2026-10-22T10:00:00Z",
    artifacts: [],
  });

  it("names each link no artifact holds", () => {
    const links: Record<string, string[]> = {
      s1: ["/uploads/aktuality/x.pdf"],
      s2: ["/uploads/aktuality/y-r2.pdf"],
    };
    const staged = (rel: string) => rel === "aktuality/x.pdf";
    expect(missingLinks([pull(11, "s1"), pull(12, "s2")], staged, (sha) => links[sha])).toEqual([
      "PR #12 links /uploads/aktuality/y-r2.pdf, which no artifact holds: stage it and release with pnpm release by hand",
    ]);
  });
});
