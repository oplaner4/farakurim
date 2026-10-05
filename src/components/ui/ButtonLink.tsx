import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { externalLinkAttrs } from "@/lib/shared/links";

export const buttonLink = cva("flex items-center justify-center font-bold no-underline", {
  variants: {
    variant: {
      primary: "bg-blue text-white hover:bg-blue-hover hover:text-white",
      /* Orange takes dark text, never white (contrast). */
      accent: "bg-orange text-on-orange hover:bg-orange-hover hover:text-on-orange",
      /* Aktuality */
      magenta: "bg-magenta text-white hover:bg-magenta-hover hover:text-white",
      /* Fotogalerie: white text on dark green in light, dark text on light green in dark. */
      green: "bg-green-ink text-on-green-ink hover:bg-green-ink-hover hover:text-on-green-ink",
      outline: "border-2 border-blue text-blue-ink hover:bg-blue hover:text-white",
      "outline-magenta": "border-2 border-magenta text-magenta-ink hover:bg-magenta hover:text-white",
      /* Petrklíč: dark text on the orange hover fill. */
      "outline-orange":
        "border-2 border-orange-ink text-orange-ink-deep hover:border-orange hover:bg-orange hover:text-on-orange",
      /* Group pages and Výuka náboženství: dark text on the green hover fill. */
      "outline-green": "border-2 border-green text-green-ink hover:bg-green hover:text-on-green",
      /* Quiet contact actions ("Zavolat", "Napsat e-mail" on Výuka náboženství). */
      "outline-neutral": "border-2 border-line text-blue-ink hover:border-blue hover:text-blue-ink",
    },
    size: {
      default: "gap-2.5 rounded-14 px-5.5",
      /* Header action: one line, a little smaller. */
      compact: "min-h-12 gap-2 rounded-14 px-4.5 whitespace-nowrap lg:px-5",
      /* 48px, 52px on desktop. */
      medium: "gap-2 rounded-14 px-5 lg:px-6",
      /* 48px on every screen (the cards of Výuka náboženství and the group pages). */
      small: "gap-2 rounded-14 px-4.5",
      /* Height and width set by the caller (full-width buttons of the event detail). */
      block: "gap-2 rounded-14",
    },
  },
  compoundVariants: [
    { variant: ["primary", "accent", "magenta", "green"], size: "default", className: "min-h-13" },
    { variant: ["primary", "accent", "magenta", "green"], size: "medium", className: "min-h-12 lg:min-h-13" },
    { variant: ["primary", "accent", "magenta", "green"], size: "small", className: "min-h-12" },
    /* The design keeps the 52px content height and adds the 2px border on top (56px). */
    {
      variant: ["outline", "outline-magenta", "outline-orange", "outline-green", "outline-neutral"],
      size: "default",
      className: "min-h-14",
    },
    /* Same for medium: 48px content + border, 52px + border on desktop. */
    {
      variant: ["outline", "outline-magenta", "outline-orange", "outline-green", "outline-neutral"],
      size: "medium",
      className: "min-h-13 lg:min-h-14",
    },
    /* And small: 48px content + border. */
    {
      variant: ["outline", "outline-magenta", "outline-orange", "outline-green", "outline-neutral"],
      size: "small",
      className: "min-h-13",
    },
  ],
  defaultVariants: { variant: "primary", size: "default" },
});

type Props = ComponentProps<"a"> & VariantProps<typeof buttonLink>;

export function ButtonLink({ variant, size, className, ...rest }: Props) {
  return <a className={buttonLink({ variant, size, className })} {...externalLinkAttrs(rest.href)} {...rest} />;
}
