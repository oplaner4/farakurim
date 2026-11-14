import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { freshTempDir, testGit } from "../test-helpers/files";
import { VENUE_LIST, venueRecord } from "../test-helpers/venues";
import { publishedContent } from "./published";

const WEEK = { validFrom: "2099-10-04", validTo: "2099-10-11" };
const day = (date: string, title: string) => ({ date, rows: [{ time: "8:00", place: "kurim", title }] });

describe("publishedContent", () => {
  const dir = freshTempDir("content-pr-published");
  const write = (path: string, value: unknown) => {
    mkdirSync(join(dir(), path, ".."), { recursive: true });
    writeFileSync(join(dir(), path), `${JSON.stringify(value)}\n`);
  };
  const sheets = (...list: unknown[]) => write("src/content/service-sheets.json", { sheets: list });

  /** The base commit: the sheets and venues given, then the working tree changed by the test. */
  function base(baseSheets: unknown[], venues = VENUE_LIST) {
    sheets(...baseSheets);
    write("src/content/venues.json", { venues });
    testGit(dir(), "init", "-q", "-b", "main");
    testGit(dir(), "add", "-A");
    testGit(dir(), "commit", "-q", "-m", "base");
    return testGit(dir(), "rev-parse", "HEAD").trim();
  }

  it("lists a new week's announcements, each with its category and linked event", () => {
    const commit = base([]);
    write("src/content/news/2099/10.json", [newsEvent({ id: "pout-2099", title: "Pouť", start: "2099-10-10" })]);
    const long = `<p>${"Zveme vás. ".repeat(20)}</p>`;
    const announcements = [
      { category: "invitation", html: "<p>Zveme na <strong>pouť</strong>&nbsp;do Lukova.</p>", newsId: "pout-2099" },
      { category: "info", html: "<ul><li>První</li><li>Druhá</li></ul>", newsId: "zadna" },
      { category: "thanks", html: long },
    ];
    sheets({ ...WEEK, days: [], announcements });
    const lines = publishedContent(dir(), commit).week(WEEK);
    expect(lines.slice(0, 3)).toEqual([
      "Announcements:",
      "- invitation: Zveme na pouť do Lukova. (event pout-2099: Pouť, 2099-10-10)",
      "- info: První Druhá (event zadna)",
    ]);
    // Cut at 120 characters, the space before the cut left out.
    expect(lines[3]).toMatch(/^- thanks: Zveme vás\. .*\S…$/);
    expect(lines[3]!.length).toBeLessThanOrEqual("- thanks: ".length + 121);
  });

  it("names what changes in a week already on the base, and nothing for a week the content lacks", () => {
    const sheet = { ...WEEK, days: [day("2099-10-04", "Mše sv.")], announcements: [] };
    const commit = base([sheet]);
    expect(publishedContent(dir(), commit).week(WEEK)).toEqual(["No change against main."]);
    sheets({ ...sheet, days: [day("2099-10-04", "Mše sv. se zpěvem scholy")] });
    expect(publishedContent(dir(), commit).week(WEEK)).toEqual(["Changed: 2099-10-04 row 1 (against main)"]);
    expect(publishedContent(dir(), commit).week({ validFrom: "2099-10-11", validTo: "2099-10-18" })).toEqual([]);
  });

  it("lists the venues and aliases the venue list gains, a new venue with its pin", () => {
    const commit = base([]);
    const [kostel, ...rest] = VENUE_LIST;
    const sal = venueRecord("kurim-sal", "Sál", "Kuřim", { aliases: ["v sále"] });
    write("src/content/venues.json", { venues: [{ ...kostel, aliases: ["kostel", "v kostele"] }, ...rest, sal] });
    expect(publishedContent(dir(), commit).venues).toEqual([
      '- New alias "v kostele" for kurim-kostel',
      "- New venue kurim-sal: Sál, Kuřim, Česko — pin: https://mapy.cz/zakladni?source=coor&id=16.5264%2C49.2966&x=16.5264&y=49.2966&z=17",
      '- New alias "v sále" for kurim-sal',
    ]);
  });
});
