import { clsx } from "clsx";
import { externalLinkAttrs } from "@/lib/shared/links";
import { ArrowRightIcon } from "./icons/navigation-icons";

export type SectionColor = "blue" | "green" | "magenta" | "orange";

const accents: Record<SectionColor, { shard: string; link: string }> = {
  blue: { shard: "bg-blue", link: "text-blue-ink" },
  green: { shard: "bg-green", link: "text-green-ink" },
  magenta: { shard: "bg-magenta", link: "text-magenta-ink" },
  orange: { shard: "bg-orange", link: "text-orange-ink" },
};

type Props = {
  id: string;
  title: string;
  color: SectionColor;
  /** `shortLabel` is used on mobile, `label` from tablet up. */
  link?: { href: string; label: string; shortLabel?: string };
  /** Smaller heading used inside panels (Kontakty on tablet/desktop). */
  compact?: boolean;
  /** The section headings of the text pages (Finanční podpora, Odkazy): 22 / 26 / 30px. */
  small?: boolean;
  /** Show the link only on desktop (the section has its own button on smaller screens). */
  linkDesktopOnly?: boolean;
  className?: string;
};

export function SectionHeading({ id, title, color, link, compact, small, linkDesktopOnly, className }: Props) {
  const accent = accents[color];
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3",
        compact ? "lg:items-center" : "lg:items-end lg:gap-4",
        className,
      )}
    >
      <div className={clsx("flex items-center gap-2.5", !small && "md:gap-3", !compact && !small && "lg:gap-3.5")}>
        <span
          className={clsx(
            "flex-none shard-br",
            small ? "h-5 w-3.5" : "h-5.5 w-4 md:h-6.5 md:w-4.5",
            !small && (compact ? "lg:h-7 lg:w-5" : "lg:h-8 lg:w-5.5"),
            accent.shard,
          )}
          aria-hidden="true"
        />
        <h2
          id={id}
          className={clsx(
            "leading-normal font-bold",
            small ? "text-22 md:text-26 lg:text-30" : "text-26 tracking-heading",
            !small &&
              (compact
                ? "lg:text-32 lg:leading-title"
                : "md:text-32 lg:text-40 lg:leading-display lg:tracking-display"),
          )}
        >
          {title}
        </h2>
      </div>
      {link && (
        <a
          href={link.href}
          {...externalLinkAttrs(link.href)}
          className={clsx(
            "min-h-11 items-center gap-1.5 text-right font-bold hover:text-ink",
            linkDesktopOnly ? "hidden lg:inline-flex" : "inline-flex",
            accent.link,
          )}
        >
          {link.shortLabel ? (
            <>
              <span className="md:hidden">{link.shortLabel}</span>
              <span className="hidden md:inline">{link.label}</span>
            </>
          ) : (
            link.label
          )}
          <ArrowRightIcon size={18} className="hidden lg:block" />
        </a>
      )}
    </div>
  );
}
