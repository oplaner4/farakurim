import { clsx } from "clsx";
import type { SectionColor } from "@/components/ui/SectionHeading";

const fills: Record<SectionColor, string> = {
  blue: "bg-blue",
  green: "bg-green",
  magenta: "bg-magenta",
  orange: "bg-orange",
};

/** The 12×16 shard in front of a "Více" group name (design/DESIGN.md §20.1). */
export function GroupShard({ color }: { color: SectionColor }) {
  return <span aria-hidden="true" className={clsx("h-4 w-3 flex-none shard-br", fills[color])} />;
}
