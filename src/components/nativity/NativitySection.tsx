import type { ReactNode } from "react";
import { SectionHeading, type SectionColor } from "@/components/ui/SectionHeading";

/**
 * A block of Betlémy (design/DESIGN.md §30.2) with its heading. The anchor pills of "Na této stránce" lead to `id`,
 * and `scroll-mt-24` keeps the heading clear of the sticky header.
 */
export function NativitySection({
  id,
  title,
  color,
  children,
}: {
  id: string;
  title: string;
  color: SectionColor;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-nadpis`} className="flex scroll-mt-24 flex-col gap-3.5">
      <SectionHeading id={`${id}-nadpis`} title={title} color={color} small />
      {children}
    </section>
  );
}
