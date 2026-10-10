import { describe, expect, it } from "vitest";
import type { PlannedPage } from "@/content/types/planned";
import { findPlannedPage, pathSegments } from "./planned-pages";

const page = (path: string): PlannedPage => ({ path, title: path, color: "blue" });
const pages = [page("/gdpr/"), page("/farni_tabor/2024/")];

describe("pathSegments", () => {
  it("splits a path without empty parts", () => {
    expect(pathSegments("/farni_tabor/2024/")).toEqual(["farni_tabor", "2024"]);
  });
});

describe("findPlannedPage", () => {
  it("finds the page at the route's segments", () => {
    expect(findPlannedPage(pages, ["farni_tabor", "2024"])?.path).toBe("/farni_tabor/2024/");
    expect(findPlannedPage(pages, ["farni_tabor"])).toBeUndefined();
  });
});
