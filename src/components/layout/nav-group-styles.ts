import type { SectionColor } from "@/components/ui/SectionHeading";

/** Group shard fill and the current page's link colour (design/DESIGN.md §20.1–20.2). */
export const groupStyles: Record<SectionColor, { shard: string; current: string }> = {
  blue: { shard: "bg-blue", current: "aria-[current=page]:text-blue-ink" },
  green: { shard: "bg-green", current: "aria-[current=page]:text-green-ink" },
  magenta: { shard: "bg-magenta", current: "aria-[current=page]:text-magenta-ink" },
  orange: { shard: "bg-orange", current: "aria-[current=page]:text-orange-ink" },
};
