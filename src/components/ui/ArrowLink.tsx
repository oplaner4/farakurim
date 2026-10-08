import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type { ComponentProps, ComponentType } from "react";
import { externalLinkAttrs, isExternalHref } from "@/lib/shared/links";
import type { IconProps } from "./icons/icon";
import { ArrowRightIcon } from "./icons/navigation-icons";

const arrowLink = cva("inline-flex items-center font-bold", {
  variants: {
    tone: {
      /* The page's link colour. */
      link: "",
      blue: "text-blue-ink hover:text-ink",
      magenta: "text-magenta-ink hover:text-ink",
      green: "text-green-ink hover:text-ink",
      orange: "text-orange-ink-deep hover:text-ink",
    },
    size: {
      default: "min-h-11",
      /* 15px text, 16px icon. */
      small: "min-h-11 text-15",
      /* 15px text, no 44px target: the desktop-only link at the foot of the next-mass card. */
      compact: "text-15",
    },
  },
  defaultVariants: { tone: "link", size: "default" },
});

/** Margin between the icon and the text, by the icon's side. */
const iconGaps = {
  start: { normal: "mr-1.5", wide: "mr-2" },
  end: { normal: "ml-1.5", wide: "ml-2" },
} as const;

type Props = ComponentProps<"a"> &
  VariantProps<typeof arrowLink> & {
    /** An arrow by default; also `ArrowUpIcon`, `ArrowLeftIcon` (with `iconAt="start"`) or `ExternalLinkIcon`. */
    icon?: ComponentType<IconProps>;
    iconAt?: "start" | "end";
    /** Space between the icon and the text: 6px, or 8px where the design has it (Finanční podpora, back links). */
    gap?: "normal" | "wide";
    /** Visibility of the icon only (e.g. `max-lg:hidden`). */
    iconClassName?: string;
  };

/**
 * A bold text link with an icon, the "Celý archiv →" of every page. The icon sits inline in the text, so it
 * follows the last word when the label wraps. A link to another site opens in a new tab and tells screen readers
 * so. Placement in the parent comes from `className`.
 */
export function ArrowLink({
  tone,
  size,
  icon: Icon = ArrowRightIcon,
  iconAt = "end",
  gap = "normal",
  iconClassName,
  className,
  children,
  ...rest
}: Props) {
  const icon = (
    <Icon
      size={size === "small" ? 16 : 18}
      className={clsx("relative -top-px inline align-middle", iconGaps[iconAt][gap], iconClassName)}
    />
  );
  return (
    <a className={arrowLink({ tone, size, className })} {...externalLinkAttrs(rest.href)} {...rest}>
      <span>
        {iconAt === "start" && icon}
        {children}
        {iconAt === "end" && icon}
        {isExternalHref(rest.href) && <span className="sr-only"> (otevře se v novém okně)</span>}
      </span>
    </a>
  );
}
