import type { NewsEvent } from "@/content/types/news";
import { events2019 } from "./2019";
import { events2020 } from "./2020";
import { events2021 } from "./2021";
import { events2022 } from "./2022";
import { events2023 } from "./2023";
import { events2024 } from "./2024";
import { events2025 } from "./2025";

export { UPLOADS } from "./uploads";

// Aktuality of the old site (farakurim.cz, 2019–2025), migrated once from its database export. One file per start
// year. Their titles repeat every year ("Farní den"), so the detail URL is the ID, which ends with the year.
export const archivedEvents: NewsEvent[] = [
  ...events2019,
  ...events2020,
  ...events2021,
  ...events2022,
  ...events2023,
  ...events2024,
  ...events2025,
].map((e) => ({ ...e, slug: e.slug ?? e.id }));
