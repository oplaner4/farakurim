import { clsx } from "clsx";
import { CopyButton } from "@/components/ui/CopyButton";

type Props = { id: string; name: string; feed: string; dot: "blue" | "magenta" };

/** "Jiná aplikace" (design/DESIGN.md §16.6, 4): a calendar's feed URL to copy into any calendar app. */
export function CalendarFeedField({ id, name, feed, dot }: Props) {
  return (
    <div className="flex flex-col gap-1.5 rounded-14 bg-raised px-3.5 py-3">
      <label htmlFor={id} className="flex items-center gap-2 font-bold">
        <span aria-hidden="true" className={clsx("size-2.5 rounded-full", dot === "blue" ? "bg-blue" : "bg-magenta")} />
        {name}
      </label>
      <input
        id={id}
        type="text"
        readOnly
        value={feed}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-11 w-full rounded-10 border-thin border-field-line bg-bg px-3 text-13 text-ink"
      />
      <CopyButton text={feed} label="Zkopírovat odkaz" tone="blue" size="small" width="label" className="self-start" />
    </div>
  );
}
