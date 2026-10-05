import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export const arrowButton = cva("flex flex-none cursor-pointer items-center justify-center rounded-full text-ink", {
  variants: {
    variant: {
      /* On a photo: the hero and the homepage album carousel. */
      overlay: "bg-overlay hover:bg-bg",
      /* On the page: the Fotogalerie strips. The border takes the hover colour of the icon. */
      outline: "border-thin border-line bg-raised hover:border-current",
    },
    /* The section colour the icon turns on hover. */
    tone: {
      blue: "hover:text-blue-ink",
      green: "hover:text-green-ink",
    },
    size: {
      default: "size-12",
      /* The hero: 44px on mobile, 48px from tablet up. */
      responsive: "size-11 md:size-12",
    },
  },
  defaultVariants: { variant: "overlay", tone: "blue", size: "default" },
});

type Props = Omit<ComponentProps<"button">, "children"> &
  VariantProps<typeof arrowButton> & {
    direction: "prev" | "next";
    /** Says what the button turns to ("Další fotografie"): the button has only an icon. */
    "aria-label": string;
  };

/**
 * A round prev/next button of the carousels. Position it (`absolute left-3`, `lg:ml-auto`) through `className`;
 * the look comes from the variants only.
 */
export function ArrowButton({ direction, variant, tone, size, className, ...rest }: Props) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button type="button" className={arrowButton({ variant, tone, size, className })} {...rest}>
      <Icon />
    </button>
  );
}
