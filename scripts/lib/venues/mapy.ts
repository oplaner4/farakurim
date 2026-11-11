import type { Position, VenueAddress } from "@/content/types/venues";
import { loadEnvLocal } from "../calendar/apply";
import { next, refusal } from "../output";

// The Mapy.com REST API (https://developer.mapy.com/rest-api/): places by name or address inside one municipality,
// the places at a position, and the position of a shared link. The key goes in a header, never in a URL.

const API = "https://api.mapy.com/v1";

/** The Kuřim church: a municipality's name means the one of that name nearest the parish. */
const PARISH = { lon: 16.5257081, lat: 49.2966286 };

/** One result of `geocode` or `rgeocode`. */
export type MapyItem = {
  name: string;
  label: string;
  position: { lon: number; lat: number };
  /** `[minLon, minLat, maxLon, maxLat]` */
  bbox?: number[];
  type: string;
  location: string;
  /** The places it lies in, smallest first. */
  regionalStructure: { name: string; type: string; isoCode?: string }[];
  zip?: string;
};

/** The key from MAPY_API_KEY (`.env.local` locally, the environment's secret in CI). */
export function mapyKey({ loadEnv = true } = {}): string {
  if (loadEnv) loadEnvLocal();
  const key = process.env.MAPY_API_KEY;
  if (!key) {
    throw refusal("no MAPY_API_KEY to look places up on Mapy.com", next("add MAPY_API_KEY to .env.local"));
  }
  return key;
}

async function call(endpoint: "geocode" | "rgeocode", params: URLSearchParams, key: string): Promise<MapyItem[]> {
  const response = await fetch(`${API}/${endpoint}?${params}`, { headers: { "X-Mapy-Api-Key": key } });
  if (!response.ok) throw new Error(`Mapy.com ${endpoint}: ${response.status} ${await response.text()}`);
  return ((await response.json()) as { items: MapyItem[] }).items;
}

const structure = (item: MapyItem, type: string) => item.regionalStructure.find((r) => r.type === type)?.name;

/** The municipality an item lies in, as Mapy.com names it. */
export const municipalityOf = (item: MapyItem) => structure(item, "regional.municipality");

/**
 * The box of `municipality`, the one of that name nearest the parish. A name alone is no filter: Mapy.com
 * reads `locality=Česká` as all of Czechia.
 */
async function municipalityBox(municipality: string, key: string): Promise<string> {
  const params = new URLSearchParams({
    query: municipality,
    lang: "cs",
    limit: "5",
    type: "regional.municipality",
    preferNear: `${PARISH.lon},${PARISH.lat}`,
  });
  const found = (await call("geocode", params, key)).find(
    (item) => item.type === "regional.municipality" && item.name === municipality && item.bbox?.length === 4,
  );
  if (!found?.bbox)
    throw refusal(`Mapy.com knows no municipality ${municipality}`, next("name the municipality as Mapy.com does"));
  return `BOX(${found.bbox.join(",")})`;
}

/**
 * Places matching `query` in `municipality` only (searched inside its box; anything outside the
 * municipality is dropped), each of `types` when given ("poi", "regional.address", …).
 */
export async function geocode(
  query: string,
  { municipality, types = [], limit = 10 }: { municipality: string; types?: string[]; limit?: number },
  key: string,
): Promise<MapyItem[]> {
  const locality = await municipalityBox(municipality, key);
  const params = new URLSearchParams({ query, lang: "cs", limit: String(limit), locality });
  for (const type of types) params.append("type", type);
  return (await call("geocode", params, key)).filter((item) => municipalityOf(item) === municipality);
}

/** The places at a position: its address, street, municipality and so on. */
export const rgeocode = ({ lat, lon }: Position, key: string) =>
  call("rgeocode", new URLSearchParams({ lon: String(lon), lat: String(lat), lang: "cs" }), key);

/**
 * The address of an item in a venue's parts. An address item's name is its street and number; any other item (a
 * place) has only the street in its structure, and the number when it has one ("55/5" alone is the address entry's
 * name). A part named as its municipality is left out ("Kuřim" in Kuřim).
 */
export function addressOf(item: MapyItem): VenueAddress {
  const street = structure(item, "regional.street");
  const number = structure(item, "regional.address");
  const streetAddress =
    item.type === "regional.address" ? item.name : [street, number].filter(Boolean).join(" ") || undefined;
  const municipality = municipalityOf(item) ?? "";
  const part = structure(item, "regional.municipality_part");
  return {
    ...(streetAddress && { streetAddress }),
    ...(part && part !== municipality && { part }),
    // A place's postcode comes without its space ("66434"), an address's with it.
    ...(item.zip && { postalCode: item.zip.replace(/^(\d{3}) ?(\d{2})$/, "$1 $2") }),
    municipality,
    country: structure(item, "regional.country") ?? "",
  };
}

const isMapyHost = (host: string) => /(^|\.)mapy\.(com|cz)$/.test(host);

/**
 * The position of a Mapy.com link; a short link (`/s/…`) is followed one redirect. A point (`source=coor`) is exact;
 * a named place gives the map's centre, which is the place only if the map was not moved before sharing.
 */
export async function shareLinkPosition(link: string): Promise<Position & { exact: boolean }> {
  let url = new URL(link);
  if (url.protocol !== "https:" || !isMapyHost(url.hostname)) throw refusal(`${link} is not a Mapy.com link`);
  if (url.pathname.startsWith("/s/")) {
    const response = await fetch(url, { redirect: "manual" });
    const location = response.headers.get("location");
    if (!location) throw refusal(`${link} does not lead anywhere (${response.status})`);
    url = new URL(location, url);
    if (!isMapyHost(url.hostname)) throw refusal(`${link} leads to ${url.hostname}, not a Mapy.com link`);
  }
  const params = url.searchParams;
  if (params.get("source") === "coor") {
    const [lon, lat] = (params.get("id") ?? "").split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, exact: true };
  }
  const lat = Number(params.get("y"));
  const lon = Number(params.get("x"));
  if (!params.has("x") || !params.has("y") || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw refusal(`${link} has no position`, next("share a point on the map (right click, Co je zde?)"));
  }
  return { lat, lon, exact: false };
}

/** The distance of two positions in metres (haversine, on a sphere of the Earth's mean radius). */
export function distanceMetres(a: Position, b: Position): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}
