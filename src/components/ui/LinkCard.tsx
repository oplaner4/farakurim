import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { externalLinkAttrs } from "@/lib/shared/links";
import { ArrowRightIcon } from "./icons/navigation-icons";

const linkCard = cva(
  "flex items-center justify-between gap-4 rounded-18 px-5 py-4.5 text-ink no-underline hover:text-ink",
  {
    variants: {
      tone: {
        /* Katecheze's "Mimořádné katecheze" (§27.1). */
        orange: "bg-orange-tint hover:bg-orange-tint-alt",
        /* "Máte dotaz k táboru?" (§29.3). */
        magenta: "bg-magenta-tint hover:bg-magenta-tint-alt",
        /* "Jiné záležitosti farnosti" (§29.4). */
        surface: "bg-surface hover:bg-line-soft",
      },
    },
  },
);

const arrowInks = { orange: "text-orange-ink", magenta: "text-magenta-ink", surface: "text-blue-ink" };

type Props = Required<VariantProps<typeof linkCard>> & {
  href: string;
  title: string;
  text: string;
  className?: string;
};

/** A whole-card link: a bold title, a line of text and an arrow on the right. */
export function LinkCard({ href, title, text, tone, className }: Props) {
  return (
    <a href={href} {...externalLinkAttrs(href)} className={linkCard({ tone, className })}>
      <span className="flex flex-col gap-0.5">
        <strong className="text-17">{title}</strong>
        <span className="text-14 text-ink-2">{text}</span>
      </span>
      <ArrowRightIcon size={22} className={clsx("flex-none", arrowInks[tone ?? "orange"])} />
    </a>
  );
}
