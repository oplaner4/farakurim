import type { NewsEvent } from "../types";
import { events2019 } from "./2019";
import { events2020 } from "./2020";

export { UPLOADS } from "./uploads";

// Aktuality of the old site (farakurim.cz, 2019–2025), migrated once from its database export. One file per start
// year. Their titles repeat every year ("Farní den"), so the detail URL is the ID, which ends with the year.
export const archivedEvents: NewsEvent[] = [...events2019, ...events2020].map((e) => ({ ...e, slug: e.slug ?? e.id }));
