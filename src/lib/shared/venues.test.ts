import { describe, expect, it } from "vitest";
import { venueLocation } from "./venues";

describe("venueLocation", () => {
  it("puts the building before its address", () => {
    expect(venueLocation({ name: "Fara", village: "Kuřim", address: "Křížkovského 55/5, 664 34 Kuřim, Česko" })).toBe(
      "Fara, Křížkovského 55/5, 664 34 Kuřim, Česko",
    );
  });

  it("names the village when the venue has no address", () => {
    expect(venueLocation({ name: "Kaple sv. Jana Nepomuckého", village: "Kuřim" })).toBe(
      "Kaple sv. Jana Nepomuckého, Kuřim",
    );
  });
});
