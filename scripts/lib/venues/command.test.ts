import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readMonth } from "@/content/news";
import { newsEvent } from "@/test/fixtures";
import { assignVenues, findLines, parseCommand } from "./command";
import { useNewsFixture, VENUE_LIST } from "../test-helpers";

describe("find", () => {
  it("lists the municipality's venues, else says it has none", () => {
    expect(findLines(VENUE_LIST, "Kuřim")).toEqual([
      "Venues of Kuřim:",
      "  kurim-kostel  Kostel sv. Maří Magdalény (kostel)",
      "  kurim-fara  Fara (areál za farou)",
    ]);
    expect(findLines(VENUE_LIST, "Lelekovice", ["vodojem"])).toEqual(["tell: Lelekovice has no venues yet."]);
  });

  it("lists only the venues whose name or an alias holds a keyword, folded", () => {
    expect(findLines(VENUE_LIST, "Kuřim", ["FAR", "zahrada"])).toEqual([
      'Venues of Kuřim with "FAR", "zahrada":',
      "  kurim-fara  Fara (areál za farou)",
    ]);
    expect(findLines(VENUE_LIST, "Kuřim", ["kaple"])).toEqual([
      'tell: no venue of Kuřim has "kaple"; all of them:',
      "  kurim-kostel  Kostel sv. Maří Magdalény (kostel)",
      "  kurim-fara  Fara (areál za farou)",
    ]);
  });
});

describe("assign", () => {
  const news = useNewsFixture({
    "2026/10.json": [
      newsEvent({ id: "a-2026", start: "2026-10-01", place: "Kuřim, areál za farou" }),
      newsEvent({ id: "b-2026", start: "2026-10-02", place: "Kuřim, farní zahrada" }),
      newsEvent({ id: "c-2026", start: "2026-10-03", place: "Kuřim, fara", venue: "kurim-fara" }),
      newsEvent({ id: "d-2026", start: "2026-10-04", place: "Česká, kaple Panny Marie Růžencové" }),
    ],
  });

  it("prints the venue of every record whose place matches exactly, writing only without check", () => {
    const before = readFileSync(join(news.dir(), "2026/10.json"), "utf8");
    const { lines, written } = assignVenues(news.dir(), VENUE_LIST, { check: true });
    expect(lines).toEqual(["Would set a-2026 venue kurim-fara", "Would set d-2026 venue ceska-kaple"]);
    expect(written).toEqual([]);
    expect(readFileSync(join(news.dir(), "2026/10.json"), "utf8")).toBe(before);

    expect(assignVenues(news.dir(), VENUE_LIST, { check: false }).written).toEqual(["2026/10.json"]);
    const a = readMonth(news.dir(), "2026/10.json").find((e) => e.id === "a-2026");
    expect(a).toMatchObject({ venue: "kurim-fara" });
  });
});

describe("parseCommand", () => {
  it("reads each subcommand and refuses a missing municipality", () => {
    expect(parseCommand(["find", "--municipality", "Kuřim", "fara", "zahrada"])).toEqual({
      sub: "find",
      municipality: "Kuřim",
      keywords: ["fara", "zahrada"],
    });
    expect(parseCommand(["lookup", "--municipality", "Česká", "--link", "https://mapy.com/s/x"])).toEqual({
      sub: "lookup",
      municipality: "Česká",
      link: "https://mapy.com/s/x",
    });
    expect(parseCommand(["lookup", "--municipality", "Česká", "sokolovna", "--out", "c.json"])).toEqual({
      sub: "lookup",
      municipality: "Česká",
      query: "sokolovna",
      out: "c.json",
    });
    expect(parseCommand(["lookup", "--municipality", "Česká", "--position", "49.28N, 16.56E"])).toEqual({
      sub: "lookup",
      municipality: "Česká",
      position: "49.28N, 16.56E",
    });
    expect(() => parseCommand(["lookup", "--municipality", "Česká", "x", "--position", "49.28N, 16.56E"])).toThrow(
      /Usage/,
    );
    expect(parseCommand(["add", "v.json", "--check"])).toEqual({ sub: "add", file: "v.json", check: true });
    const add = ["add", "c.json", "--pick", "2", "--name", "Sokolovna", "--alias", "a", "--alias", "b"];
    expect(parseCommand(add)).toEqual({
      sub: "add",
      file: "c.json",
      check: false,
      pick: 2,
      name: "Sokolovna",
      aliases: ["a", "b"],
    });
    expect(parseCommand(["alias", "kurim-fara", "farní zahrada"])).toEqual({
      sub: "alias",
      id: "kurim-fara",
      text: "farní zahrada",
      check: false,
    });
    expect(parseCommand(["assign", "--check"])).toEqual({ sub: "assign", check: true });
    expect(() => parseCommand(["find", "Kuřim, fara"])).toThrow(/Usage: pnpm venue/);
    expect(() => parseCommand(["move"])).toThrow(/Usage: pnpm venue/);
    expect(parseCommand(["set", "ceska-kaple", "c.json", "--pick", "2", "--check"])).toEqual({
      sub: "set",
      id: "ceska-kaple",
      file: "c.json",
      pick: 2,
      check: true,
    });
    expect(parseCommand(["set", "ceska-kaple", "--name", "Kaple"])).toEqual({
      sub: "set",
      id: "ceska-kaple",
      name: "Kaple",
      check: false,
    });
    // set changes something, takes --pick only with a file and never an alias.
    expect(() => parseCommand(["set", "ceska-kaple"])).toThrow(/Usage/);
    expect(() => parseCommand(["set", "ceska-kaple", "--name", "K", "--pick", "1"])).toThrow(/Usage/);
    expect(() => parseCommand(["set", "ceska-kaple", "--name", "K", "--alias", "k"])).toThrow(/Usage/);
    // A name or an alias is add's, and a pick is a whole number from 1.
    expect(() => parseCommand(["lookup", "--municipality", "Česká", "x", "--name", "X"])).toThrow(/Usage/);
    expect(() => parseCommand(["add", "c.json", "--pick", "0"])).toThrow(/Usage/);
    expect(() => parseCommand(["add", "c.json", "--pick", "1.5"])).toThrow(/Usage/);
  });
});
