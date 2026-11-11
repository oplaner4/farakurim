import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/test/fetch";
import { addressOf, distanceMetres, geocode, mapyKey, municipalityOf, rgeocode, shareLinkPosition } from "./mapy";
import type { MapyItem } from "./mapy";

// The example item of the Mapy.com REST API docs.
const tynska: MapyItem = {
  name: "Týnská ulička 610/7",
  label: "Adresa",
  position: { lon: 14.4225, lat: 50.0875 },
  type: "regional.address",
  location: "Praha 1 - Staré Město, Česko",
  regionalStructure: [
    { name: "Staré Město", type: "regional.municipality_part" },
    { name: "Praha 1", type: "regional.municipality" },
    { name: "Česko", type: "regional.country", isoCode: "CZ" },
  ],
  zip: "110 00",
};

const inMunicipalityItem = (name: string, municipality: string): MapyItem => ({
  ...tynska,
  name,
  regionalStructure: [
    { name: municipality, type: "regional.municipality" },
    { name: "Česko", type: "regional.country" },
  ],
});

const stubFetch = (answer: () => Response) => {
  const fetchMock = vi.fn<typeof globalThis.fetch>(async () => answer());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("geocode", () => {
  // The municipality "Česká" first (its box, the one nearest the parish), then the places inside that box.
  const ceska = {
    ...inMunicipalityItem("Česká", "Česká"),
    type: "regional.municipality",
    bbox: [16.55, 49.27, 16.58, 49.29],
  };
  const answers = (...bodies: unknown[]) => {
    const queue = [...bodies];
    return stubFetch(() => jsonResponse(queue.shift()));
  };

  it("searches inside the municipality's box, in Czech, with the key in a header, and keeps only its items", async () => {
    const fetchMock = answers(
      { items: [inMunicipalityItem("Česká", "Brno"), ceska] },
      { items: [inMunicipalityItem("Česká", "Brno"), inMunicipalityItem("Sokolovna", "Česká")] },
    );
    const items = await geocode("sokolovna", { municipality: "Česká", types: ["poi", "regional.address"] }, "KEY");
    expect(items.map((i) => i.name)).toEqual(["Sokolovna"]);
    const [[first], [url, init]] = fetchMock.mock.calls;
    const box = new URL(String(first)).searchParams;
    expect([box.get("query"), box.getAll("type"), box.get("preferNear")]).toEqual([
      "Česká",
      ["regional.municipality"],
      "16.5257081,49.2966286",
    ]);
    const params = new URL(String(url)).searchParams;
    expect(String(url)).toMatch(/^https:\/\/api\.mapy\.com\/v1\/geocode\?/);
    expect(params.get("query")).toBe("sokolovna");
    expect(params.get("lang")).toBe("cs");
    expect(params.get("locality")).toBe("BOX(16.55,49.27,16.58,49.29)");
    expect(params.getAll("type")).toEqual(["poi", "regional.address"]);
    expect(params.has("apikey")).toBe(false);
    expect(new Headers(init?.headers).get("X-Mapy-Api-Key")).toBe("KEY");
  });

  it("refuses a name Mapy.com knows as no municipality", async () => {
    answers({ items: [inMunicipalityItem("Česká", "Brno")] });
    await expect(geocode("x", { municipality: "Česká" }, "KEY")).rejects.toThrow(/no municipality Česká/);
  });

  it("throws the status of a failed call", async () => {
    stubFetch(() => jsonResponse({ message: "bad key" }, 403));
    await expect(geocode("x", { municipality: "Česká" }, "KEY")).rejects.toThrow(/Mapy\.com geocode: 403/);
  });
});

describe("rgeocode", () => {
  it("asks for the position's places", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ items: [tynska] }));
    expect(await rgeocode({ lat: 50.0875, lon: 14.4225 }, "KEY")).toEqual([tynska]);
    const params = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect([params.get("lat"), params.get("lon")]).toEqual(["50.0875", "14.4225"]);
  });
});

describe("addressOf", () => {
  it("takes the parts of an address item", () => {
    expect(municipalityOf(tynska)).toBe("Praha 1");
    expect(addressOf(tynska)).toEqual({
      streetAddress: "Týnská ulička 610/7",
      part: "Staré Město",
      postalCode: "110 00",
      municipality: "Praha 1",
      country: "Česko",
    });
  });

  it("takes the street of a place, which has no address of its own (a real answer)", () => {
    const kostel: MapyItem = {
      name: "Kostel sv. Markéty",
      label: "Kostel",
      position: { lon: 16.50123, lat: 49.29334 },
      type: "poi",
      location: "Kuřimská, Moravské Knínice, Česko",
      regionalStructure: [
        { name: "Kuřimská", type: "regional.street" },
        { name: "Moravské Knínice", type: "regional.municipality" },
        { name: "okres Brno-venkov", type: "regional.region" },
        { name: "Česko", type: "regional.country", isoCode: "CZ" },
      ],
    };
    expect(addressOf(kostel)).toEqual({
      streetAddress: "Kuřimská",
      municipality: "Moravské Knínice",
      country: "Česko",
    });
    const numbered: MapyItem = {
      ...kostel,
      regionalStructure: [{ name: "55/5", type: "regional.address" }, ...kostel.regionalStructure],
    };
    expect(addressOf(numbered).streetAddress).toBe("Kuřimská 55/5");
  });

  it("writes a place's postcode with its space, as an address's", () => {
    expect(addressOf({ ...tynska, type: "poi", zip: "11000" }).postalCode).toBe("110 00");
  });

  it("leaves out a part named as the municipality", () => {
    const kurim: MapyItem = {
      ...tynska,
      name: "Křížkovského 55/5",
      zip: "664 34",
      regionalStructure: [
        { name: "Kuřim", type: "regional.municipality_part" },
        { name: "Kuřim", type: "regional.municipality" },
        { name: "Česko", type: "regional.country" },
      ],
    };
    expect(addressOf(kurim)).toEqual({
      streetAddress: "Křížkovského 55/5",
      postalCode: "664 34",
      municipality: "Kuřim",
      country: "Česko",
    });
  });
});

describe("shareLinkPosition", () => {
  it("reads a short link's redirect: the map's centre for a named place", async () => {
    const fetchMock = stubFetch(
      () =>
        new Response(null, {
          status: 301,
          headers: {
            location: "https://mapy.com/cs/zakladni?source=base&id=2073423&ds=2&x=16.5826607&y=49.2935811&z=17",
          },
        }),
    );
    expect(await shareLinkPosition("https://mapy.com/s/pajohadave")).toEqual({
      lat: 49.2935811,
      lon: 16.5826607,
      exact: false,
    });
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe("manual");
  });

  it("takes the exact position of a point, without a request for a full link", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 500 }));
    const url = "https://mapy.cz/zakladni?source=coor&id=16.5257081%2C49.2966286&x=16.52&y=49.29&z=17";
    expect(await shareLinkPosition(url)).toEqual({ lat: 49.2966286, lon: 16.5257081, exact: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a link that is not Mapy.com's, without a request", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 500 }));
    await expect(shareLinkPosition("https://example.com/s/pajohadave")).rejects.toThrow(/not a Mapy\.com link/);
    await expect(shareLinkPosition("https://mapy.com.example.com/s/x")).rejects.toThrow(/not a Mapy\.com link/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a link without a position", async () => {
    stubFetch(() => new Response(null, { status: 301, headers: { location: "https://mapy.com/cs/zakladni" } }));
    await expect(shareLinkPosition("https://mapy.com/s/abc")).rejects.toThrow(/no position/);
  });
});

describe("distanceMetres", () => {
  it("is about 111 m for 0.001° of latitude", () => {
    expect(distanceMetres({ lat: 49.29, lon: 16.52 }, { lat: 49.291, lon: 16.52 })).toBeCloseTo(111, -0.5);
  });
});

describe("mapyKey", () => {
  it("refuses without MAPY_API_KEY, naming .env.local", () => {
    vi.stubEnv("MAPY_API_KEY", "");
    expect(() => mapyKey({ loadEnv: false })).toThrow(/next: add MAPY_API_KEY to \.env\.local/);
    vi.stubEnv("MAPY_API_KEY", "KEY");
    expect(mapyKey({ loadEnv: false })).toBe("KEY");
  });
});
