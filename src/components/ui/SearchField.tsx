import { clsx } from "clsx";
import type { ComponentProps } from "react";
import { SearchIcon } from "./icons/navigation-icons";

type Props = Omit<ComponentProps<"input">, "type"> & {
  /** Sizes and places the field (`max-w-140`); the input itself fills it. */
  className?: string;
};

/**
 * The search field of the text pages (Archiv aktualit, Seznam aktivit): a search input with the magnifier inside on
 * the left. The caller renders the `<label>` (by `id`); `ref`, `value` and the handlers go to the input.
 */
export function SearchField({ className, ...rest }: Props) {
  return (
    <div className={clsx("relative flex items-center", className)}>
      <SearchIcon size={20} className="pointer-events-none absolute left-3.5 text-muted" />
      <input
        type="search"
        className="min-h-12.5 w-full rounded-14 border-thin border-field-line bg-raised pr-4 pl-11 text-16 text-ink placeholder:text-muted"
        {...rest}
      />
    </div>
  );
}
