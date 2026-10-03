import { clsx } from "clsx";
import type { ComponentProps } from "react";

const variants = {
  primary: "min-h-13 bg-blue text-white hover:bg-blue-ink hover:text-white",
  /* Orange takes dark text, never white (contrast). */
  accent: "min-h-13 bg-orange text-ink hover:bg-orange-hover hover:text-ink",
  /* The design keeps the 52px content height and adds the 2px border on top (56px). */
  outline: "min-h-14 border-2 border-blue text-blue-ink hover:bg-blue hover:text-white",
};

type Props = ComponentProps<"a"> & { variant?: keyof typeof variants };

export function ButtonLink({ variant = "primary", className, ...rest }: Props) {
  return (
    <a
      className={clsx(
        "flex items-center justify-center gap-2.5 rounded-14 px-5.5 font-bold no-underline",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
