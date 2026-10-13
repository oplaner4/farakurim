import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * The round filter and tab pills (Seznam aktivit, Výuka náboženství, Kronika, Pořad bohoslužeb): a neutral pill,
 * filled in the section colour when pressed (`aria-pressed`) or selected (`aria-selected`, tabs).
 */
export const filterPill = cva(
  "flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-thin border-line bg-surface text-15 font-bold text-ink",
  {
    variants: {
      tone: {
        /* Dark text on green in both themes. */
        green:
          "hover:border-green aria-pressed:border-green aria-pressed:bg-green aria-pressed:text-on-green aria-selected:border-green aria-selected:bg-green aria-selected:text-on-green",
        /* Kronika: lighter blue with dark text in the dark theme. */
        blue: "hover:border-blue-active aria-pressed:border-blue-active aria-pressed:bg-blue-active aria-pressed:text-on-blue-active",
        /* Pořad bohoslužeb: the mass blue with white text, as the primary button. */
        primary: "hover:border-blue aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-white",
      },
      /* A pill with a count beside its label ("Vše 60") is a little narrower. */
      size: {
        default: "px-4",
        count: "px-3.5",
        /* The weekday filter: a short label ("Po") in a pill growing with the screen. */
        day: "min-w-12 px-3.5 md:min-h-11.5 md:min-w-13 md:px-4 md:text-16 lg:min-h-12 lg:min-w-14 lg:px-4.5",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type Props = ComponentProps<"button"> & VariantProps<typeof filterPill>;

export function FilterPill({ tone, size, className, ...rest }: Props) {
  return <button type="button" className={filterPill({ tone, size, className })} {...rest} />;
}
