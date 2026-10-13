import { clsx } from "clsx";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { buttonLink } from "./ButtonLink";

type Props = ComponentProps<"button"> & VariantProps<typeof buttonLink>;

/** `ButtonLink`'s look on a `<button>`, for an action on the page ("Sdílet", "Načíst starší ročníky"). */
export function Button({ variant, size, className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={buttonLink({ variant, size, className: clsx("cursor-pointer", className) })}
      {...rest}
    />
  );
}
