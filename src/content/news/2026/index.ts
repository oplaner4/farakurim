import type { NewsEvent } from "@/content/types/news";
import { january } from "./01";
import { february } from "./02";
import { march } from "./03";
import { april } from "./04";
import { may } from "./05";
import { june } from "./06";
import { july } from "./07";
import { august } from "./08";
import { september } from "./09";
import { october } from "./10";
import { november } from "./11";
import { december } from "./12";

// This year's aktuality, added with the farnost-create-aktualita skill: one file per start month, each in
// start-date order.
export const events2026: NewsEvent[] = [
  ...january,
  ...february,
  ...march,
  ...april,
  ...may,
  ...june,
  ...july,
  ...august,
  ...september,
  ...october,
  ...november,
  ...december,
];
