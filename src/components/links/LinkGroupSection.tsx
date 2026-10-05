import { clsx } from "clsx";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { LinkGroup, LinkGroupColor } from "@/content/types/links";
import { displayDomain, NEW_TAB } from "@/lib/shared/links";

/** The initial's tile and the domain line take the group colour (§23). */
const tones: Record<LinkGroupColor, { tile: string; ink: string }> = {
  blue: { tile: "bg-blue-tint text-blue-ink", ink: "text-blue-ink" },
  magenta: { tile: "bg-magenta-tint text-magenta-ink", ink: "text-magenta-ink" },
  green: { tile: "bg-green-tint text-green-ink", ink: "text-green-ink" },
  orange: { tile: "bg-orange-tint text-orange-ink", ink: "text-orange-ink" },
};

/**
 * One group of Odkazy (§23): an H2 with the group's shard and a grid of link cards (1 / 2 / 4 columns). The whole
 * card is the link; it opens in a new tab and says so to screen readers.
 */
export function LinkGroupSection({ group }: { group: LinkGroup }) {
  const tone = tones[group.color];
  const headingId = `odkazy-${group.id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3.5">
      <SectionHeading id={headingId} title={group.title} color={group.color} small />
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {group.links.map((link) => (
          <li key={link.href} className="min-w-0">
            <a
              href={link.href}
              {...NEW_TAB}
              className="flex h-full items-start gap-3.5 rounded-18 bg-surface p-4 text-ink no-underline hover:bg-line hover:text-ink"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "flex size-11 flex-none items-center justify-center rounded-12 text-20 font-bold",
                  tone.tile,
                )}
              >
                {link.name.charAt(0)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-card">
                <strong className="text-17">{link.name}</strong>
                <span className="text-14 text-ink-2">{link.description}</span>
                <span className={clsx("mt-1 flex items-center gap-1 text-13 font-bold", tone.ink)}>
                  {displayDomain(link.href)}
                  <ExternalLinkIcon size={16} className="flex-none" />
                  <span className="sr-only"> (otevře se v novém okně)</span>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
