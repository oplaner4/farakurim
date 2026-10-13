import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/** A bold blue text action beside a heading or a count ("Zrušit hledání", "Skrýt proběhlé dny"). */
export const textButton = cva("min-h-11 cursor-pointer px-1 font-bold text-blue-ink hover:text-blue-ink-hover", {
  variants: {
    size: {
      default: "text-15",
      /* Beside the archive's result count: 14px on mobile. */
      small: "text-14 md:text-15",
    },
  },
  defaultVariants: { size: "default" },
});

type Props = ComponentProps<"button"> & VariantProps<typeof textButton>;

export function TextButton({ size, className, ...rest }: Props) {
  return <button type="button" className={textButton({ size, className })} {...rest} />;
}
