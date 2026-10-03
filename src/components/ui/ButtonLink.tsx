import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

export const buttonLink = cva("flex items-center justify-center font-bold no-underline", {
  variants: {
    variant: {
      primary: "bg-blue text-white hover:bg-blue-hover hover:text-white",
      /* Orange takes dark text, never white (contrast). */
      accent: "bg-orange text-on-orange hover:bg-orange-hover hover:text-on-orange",
      /* Aktuality */
      magenta: "bg-magenta text-white hover:bg-magenta-hover hover:text-white",
      outline: "border-2 border-blue text-blue-ink hover:bg-blue hover:text-white",
      "outline-magenta": "border-2 border-magenta text-magenta-ink hover:bg-magenta hover:text-white",
    },
    size: {
      default: "gap-2.5 rounded-14 px-5.5",
      /* Header action: one line, a little smaller. */
      compact: "min-h-12 gap-2 rounded-14 px-4.5 whitespace-nowrap lg:px-5",
      /* 48px, 52px on desktop. */
      medium: "gap-2 rounded-14 px-5 lg:px-6",
      /* Height and width set by the caller (full-width buttons of the event detail). */
      block: "gap-2 rounded-14",
    },
  },
  compoundVariants: [
    { variant: ["primary", "accent", "magenta"], size: "default", className: "min-h-13" },
    { variant: ["primary", "accent", "magenta"], size: "medium", className: "min-h-12 lg:min-h-13" },
    /* The design keeps the 52px content height and adds the 2px border on top (56px). */
    { variant: ["outline", "outline-magenta"], size: "default", className: "min-h-14" },
    /* Same for medium: 48px content + border, 52px + border on desktop. */
    { variant: ["outline", "outline-magenta"], size: "medium", className: "min-h-13 lg:min-h-14" },
  ],
  defaultVariants: { variant: "primary", size: "default" },
});

type Props = ComponentProps<"a"> & VariantProps<typeof buttonLink>;

export function ButtonLink({ variant, size, className, ...rest }: Props) {
  return <a className={buttonLink({ variant, size, className })} {...rest} />;
}
