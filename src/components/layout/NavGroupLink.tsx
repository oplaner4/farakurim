import { clsx } from "clsx";
import type { ReactNode } from "react";
import { externalLinkAttrs } from "@/lib/links";
import type { SectionColor } from "@/components/ui/SectionHeading";

const currentColors: Record<SectionColor, string> = {
  blue: "aria-[current=page]:text-blue-ink",
  green: "aria-[current=page]:text-green-ink",
  magenta: "aria-[current=page]:text-magenta-ink",
  orange: "aria-[current=page]:text-orange-ink",
};

/** A link in a "Více" group; the current page is bold in the group's ink colour (design/DESIGN.md §20.2). */
export function NavGroupLink({
  href,
  color,
  currentHref,
  className,
  children,
}: {
  href: string;
  color: SectionColor;
  currentHref?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-current={href === currentHref ? "page" : undefined}
      className={clsx(
        "flex items-center text-ink no-underline hover:text-blue-ink aria-[current=page]:font-bold",
        currentColors[color],
        className,
      )}
      {...externalLinkAttrs(href)}
    >
      {children}
    </a>
  );
}
