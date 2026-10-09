import type { NewsEvent } from "@/content/types/news";
import { events2019 } from "./2019";
import { events2020 } from "./2020";
import { events2021 } from "./2021";
import { events2022 } from "./2022";
import { events2023 } from "./2023";
import { events2024 } from "./2024";
import { events2025 } from "./2025";
import { events2026 } from "./2026";

// Every aktualita, by start year. 2026/ is this year (one file per month); 2019–2025 were migrated once from the
// old site's database (farakurim.cz), one file per year. Which ones are current and which archived is decided
// by date (src/lib/news/), not by the file they are in.

export const events: NewsEvent[] = [
  ...events2026,
  ...events2025,
  ...events2024,
  ...events2023,
  ...events2022,
  ...events2021,
  ...events2020,
  ...events2019,
];
