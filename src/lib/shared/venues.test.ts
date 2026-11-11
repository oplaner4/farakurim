import { describe, expect, it } from "vitest";
import { formatAddress, venueLocation } from "./venues";

const fara = {
  id: "kurim-fara",
  name: "Fara",
  address: { streetAddress: "Křížkovského 55/5", postalCode: "664 34", municipality: "Kuřim", country: "Česko" },
  position: { lat: 49.2965974, lon: 16.526404 },
};

describe("formatAddress", () => {
  it("writes a postal address as Mapy.com does", () => {
    expect(formatAddress(fara.address)).toBe("Křížkovského 55/5, 664 34 Kuřim, Česko");
  });

  it("leaves out the parts it does not have", () => {
    expect(formatAddress({ municipality: "Kuřim", country: "Česko" })).toBe("Kuřim, Česko");
    expect(formatAddress({ streetAddress: "Podhoří", municipality: "Kuřim", country: "Česko" })).toBe(
      "Podhoří, Kuřim, Česko",
    );
  });

  it("names the part of the municipality after it", () => {
    expect(
      formatAddress({
        streetAddress: "Vranovská 766/103",
        part: "Husovice",
        postalCode: "614 00",
        municipality: "Brno",
        country: "Česko",
      }),
    ).toBe("Vranovská 766/103, 614 00 Brno - Husovice, Česko");
  });
});

describe("venueLocation", () => {
  it("puts the building before its address", () => {
    expect(venueLocation(fara)).toBe("Fara, Křížkovského 55/5, 664 34 Kuřim, Česko");
  });
});
