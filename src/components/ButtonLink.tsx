import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const buttonLink = cva("flex items-center justify-center font-bold no-underline", {
  variants: {
    variant: {
      primary: "bg-blue text-white hover:bg-blue-ink hover:text-white",
      /* Orange takes dark text, never white (contrast). */
      accent: "bg-orange text-ink hover:bg-orange-hover hover:text-ink",
      outline: "border-2 border-blue text-blue-ink hover:bg-blue hover:text-white",
    },
    size: {
      default: "gap-2.5 rounded-14 px-5.5",
      /* Header action: one line, a little smaller. */
      compact: "min-h-12 gap-2 rounded-14 px-4.5 whitespace-nowrap lg:px-5",
    },
  },
  compoundVariants: [
    { variant: ["primary", "accent"], size: "default", className: "min-h-13" },
    /* The design keeps the 52px content height and adds the 2px border on top (56px). */
    { variant: "outline", size: "default", className: "min-h-14" },
  ],
  defaultVariants: { variant: "primary", size: "default" },
});

type Props = ComponentProps<"a"> & VariantProps<typeof buttonLink>;

export function ButtonLink({ variant, size, className, ...rest }: Props) {
  return <a className={buttonLink({ variant, size, className })} {...rest} />;
}
