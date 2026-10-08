import type { Intentions } from "@/content/types/services";
import { ArrowUpIcon } from "@/components/ui/icons/navigation-icons";
import { ArrowLink } from "./InfoCards";

/**
 * "Intence – mše na váš úmysl" (design/DESIGN.md §14.1, 3a): a blue-tint card with a corner shard. Desktop puts
 * the text left and the reasons right; mobile and tablet stack them.
 */
export function IntentionsCard({ text }: { text: Intentions }) {
  return (
    <section
      aria-labelledby="intence"
      className="relative flex flex-col gap-3.5 overflow-hidden rounded-24 bg-blue-tint p-5 md:p-6 lg:rounded-28 lg:p-7"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-blue shard-tr" />
      <div className="contents lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2.5">
          <h2 id="intence" className="pr-12 text-20 font-bold md:text-22 lg:text-24">
            Intence – mše na váš úmysl
          </h2>
          <p className="text-ink-2">
            {text.intro.before}
            <strong className="text-ink">{text.intro.emphasis}</strong>
            {text.intro.after}
          </p>
          <p className="text-ink-2">{text.why}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5">
          <h3 className="text-15 font-bold">Za co můžete prosit nebo děkovat</h3>
          <ul className="flex flex-wrap gap-2">
            {text.reasons.map((reason) => (
              <li key={reason} className="rounded-full bg-raised px-3 py-1.5 text-14 font-bold text-blue-ink">
                {reason}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-14 text-muted">{text.note}</p>
        </div>
      </div>
      <ArrowLink href="#rozpis" icon={ArrowUpIcon}>
        Intence na tento týden najdete v rozpisu bohoslužeb
      </ArrowLink>
    </section>
  );
}
