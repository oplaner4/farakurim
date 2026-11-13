import { describe, expect, it } from "vitest";
import { venueListChangeProblem } from "./changes";
import { VENUE_LIST, venueRecord } from "../test-helpers/venues";

describe("venueListChangeProblem", () => {
  const [kostel, fara, kaple] = VENUE_LIST;

  it("accepts new venues and new aliases, in any order", () => {
    const sokolovna = venueRecord("ceska-sokolovna", "Sokolovna", "Česká");
    const added = [{ ...fara, aliases: ["areál za farou", "farní zahrada"] }, kostel, kaple, sokolovna];
    expect(venueListChangeProblem(VENUE_LIST, added)).toBeUndefined();
  });

  it("refuses a removed venue, a changed one and a removed alias", () => {
    expect(venueListChangeProblem(VENUE_LIST, [kostel, kaple])).toBe("it removes the venue kurim-fara");
    const moved = { ...fara, address: { ...fara.address, streetAddress: "Jiná 1" } };
    expect(venueListChangeProblem(VENUE_LIST, [kostel, moved, kaple])).toBe("it changes the venue kurim-fara");
    const renamed = { ...kaple, name: "Kaple" };
    expect(venueListChangeProblem(VENUE_LIST, [kostel, fara, renamed])).toBe("it changes the venue ceska-kaple");
    expect(venueListChangeProblem(VENUE_LIST, [{ ...kostel, aliases: [] }, fara, kaple])).toBe(
      'it removes the alias "kostel" of kurim-kostel',
    );
  });
});
