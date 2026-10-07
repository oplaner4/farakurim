import { describe, expect, it } from "vitest";
import { groupPages } from "./groups";
import { plannedPages } from "./planned-pages";
import { links, navGroups } from "./site";
import { duplicates } from "./test-helpers";

describe("Stránky v přípravě (planned-pages.ts)", () => {
  it("gives each placeholder one root-relative path with a trailing slash", () => {
    const paths = plannedPages.map((p) => p.path);
    expect(paths.filter((p) => !/^\/[a-z0-9_/]+\/$/.test(p))).toEqual([]);
    expect(duplicates(paths)).toEqual([]);
  });

  it("leads every link of the Více menu and Další skupiny to a page of the site", () => {
    const pages = new Set([...plannedPages.map((p) => p.path), ...Object.values(links)]);
    const hrefs = [...navGroups.flatMap((g) => g.links.map((l) => l.href)), ...groupPages.map((g) => g.href)];
    expect(hrefs.filter((href) => !pages.has(href))).toEqual([]);
  });

  it("does not take the place of a rebuilt page", () => {
    const rebuilt = [...Object.values(links), ...groupPages.map((g) => g.href)];
    expect(plannedPages.filter((p) => rebuilt.includes(p.path)).map((p) => p.path)).toEqual([]);
  });

  it("links every breadcrumb to a page of the site", () => {
    const pages = new Set([...plannedPages.map((p) => p.path), ...Object.values(links)]);
    const crumbs = plannedPages.flatMap((p) => (p.parents ?? []).map((c) => c.href));
    expect(crumbs.filter((href) => !pages.has(href))).toEqual([]);
  });
});
