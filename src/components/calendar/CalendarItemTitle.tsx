import { clsx } from "clsx";
import type { AgendaItem } from "@/lib/calendar/agenda";

type Props = {
  item: Pick<AgendaItem, "title" | "cancelled" | "changed" | "href">;
  /** The title's box (`line-clamp-2`, `font-bold`); the label and the link sit inside it. */
  className?: string;
  /** The "zrušeno" label's colour on a coloured badge. */
  labelClassName?: string;
  /** A badge links nothing: the whole day cell is a button. */
  linked?: boolean;
};

/**
 * A calendar item's title, linking its detail page. A cancelled one (design/DESIGN.md §11.9) is struck through after a
 * small "zrušeno" outside the link, which screen readers read as text. A changed service starts with an orange
 * "změna" pill.
 */
export function CalendarItemTitle({ item, className, labelClassName = "text-ink-2", linked = true }: Props) {
  const title = item.cancelled ? <span className="line-through">{item.title}</span> : item.title;
  return (
    <span title={item.title} className={className}>
      {item.changed && (
        <span className="mr-1.5 rounded-full bg-orange-tint px-2 py-px text-12 font-bold text-orange-ink-deep">
          změna
        </span>
      )}
      {item.cancelled && <span className={clsx("mr-1.5 text-12 font-normal", labelClassName)}>zrušeno</span>}
      {linked && item.href ? <a href={item.href}>{title}</a> : title}
    </span>
  );
}
