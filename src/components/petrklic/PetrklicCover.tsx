import { clsx } from "clsx";
import type { PetrklicIssue } from "@/content/types/petrklic";
import { issueLabel } from "@/lib/petrklic/issues";

/* Placeholder tints by issue number (design/DESIGN.md §18.1): 1 green, 2 blue, 3 orange, 4 magenta. */
const tints = [
  "bg-green-tint text-green-ink",
  "bg-blue-tint-alt text-blue-ink",
  "bg-orange-tint-alt text-orange-ink-deep",
  "bg-magenta-tint-alt text-magenta-ink",
];

type Props = {
  issue: PetrklicIssue;
  /** Size, radius and shadow. */
  className?: string;
};

/** An issue's cover (A4), or a tinted placeholder until the cover image exists. Decorative: callers label it. */
export function PetrklicCover({ issue, className }: Props) {
  if (issue.cover) {
    return (
      <img
        src={issue.cover}
        alt=""
        width={600}
        height={849}
        loading="lazy"
        className={clsx("aspect-a4 bg-raised object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex aspect-a4 flex-col justify-between p-3 font-bold",
        tints[(issue.number - 1) % tints.length],
        className,
      )}
    >
      <span className="text-18">Petrklíč</span>
      <span className="text-18 text-ink">{issueLabel(issue)}</span>
    </span>
  );
}
