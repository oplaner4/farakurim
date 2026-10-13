import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * The small rounded-square buttons beside a heading: prev/next of the Kalendář month, the homepage week and the
 * Petrklíč viewer, and "Dnes". Disabled at the first or last page, faded and without the hover.
 */
export const toolbarButton = cva(
  "flex min-h-11 cursor-pointer items-center justify-center rounded-12 border-thin border-line bg-raised disabled:cursor-default disabled:opacity-40",
  {
    variants: {
      /* The section colour of the hover. */
      tone: {
        /* Kalendář: the fill darkens. */
        neutral: "hover:bg-surface disabled:hover:bg-raised",
        blue: "hover:border-blue hover:text-blue-ink disabled:hover:border-line disabled:hover:text-ink",
        orange: "hover:border-orange disabled:hover:border-line",
      },
      content: {
        /* A chevron: square; it needs an `aria-label`. */
        icon: "w-11 text-ink",
        label: "px-3.5 text-15 font-bold text-blue-ink",
      },
    },
    defaultVariants: { tone: "neutral", content: "icon" },
  },
);

type Props = ComponentProps<"button"> & VariantProps<typeof toolbarButton>;

export function ToolbarButton({ tone, content, className, ...rest }: Props) {
  return <button type="button" className={toolbarButton({ tone, content, className })} {...rest} />;
}
