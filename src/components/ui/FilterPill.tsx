import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * The round filter and tab pills of the text pages (Seznam aktivit, Výuka náboženství, Kronika): a neutral pill,
 * filled in the section colour when pressed (`aria-pressed`) or selected (`aria-selected`, tabs).
 */
export const filterPill = cva(
  "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-thin border-line bg-surface text-15 font-bold text-ink",
  {
    variants: {
      tone: {
        /* Dark text on green in both themes. */
        green:
          "hover:border-green aria-pressed:border-green aria-pressed:bg-green aria-pressed:text-on-green aria-selected:border-green aria-selected:bg-green aria-selected:text-on-green",
        /* Kronika: lighter blue with dark text in the dark theme. */
        blue: "hover:border-blue-active aria-pressed:border-blue-active aria-pressed:bg-blue-active aria-pressed:text-on-blue-active",
      },
      /* A pill with a count beside its label ("Vše 60") is a little narrower. */
      size: { default: "px-4", count: "px-3.5" },
    },
    defaultVariants: { size: "default" },
  },
);

type Props = ComponentProps<"button"> & VariantProps<typeof filterPill>;

export function FilterPill({ tone, size, className, ...rest }: Props) {
  return <button type="button" className={filterPill({ tone, size, className })} {...rest} />;
}
