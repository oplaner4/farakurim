import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const card = cva("flex flex-col rounded-28 p-6", {
  variants: {
    tone: {
      plain: "border border-line bg-raised",
      /* Podpora farnosti: room for the shard in the corner. */
      orange: "relative overflow-hidden bg-orange-tint",
      surface: "bg-surface",
    },
    /* Gap between the heading and the blocks: 12, 14 or 16px. */
    spacing: { 3: "gap-3", 3.5: "gap-3.5", 4: "gap-4" },
  },
  defaultVariants: { tone: "plain", spacing: 3 },
});

type Props = VariantProps<typeof card> & {
  id: string;
  title: string;
  /** Placement in the page grid only. */
  className?: string;
  children: ReactNode;
};

/** A block of the Kontakty page (design/DESIGN.md §15.1) with its 22px heading. */
export function ContactCard({ id, title, tone, spacing, className, children }: Props) {
  return (
    <section aria-labelledby={id} className={card({ tone, spacing, className })}>
      <h2 id={id} className="text-22 font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
