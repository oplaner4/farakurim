import { clsx } from "clsx";
import type { CampQuote } from "@/content/types/camp";
import { initial } from "@/lib/camp/team";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** The avatars' tints in turn: blue, green, orange. */
const AVATARS = [
  "bg-blue-tint-alt text-blue-ink",
  "bg-green-tint text-green-ink",
  "bg-orange-tint text-orange-ink-deep",
];

/**
 * "Co pro nás tábor znamená" (design/DESIGN.md §29.2, 6): the participants' own words as quote cards with an initial
 * avatar and the first name; 1 / 3 / 3 columns.
 */
export function CampQuotes({ quotes }: { quotes: CampQuote[] }) {
  return (
    <section aria-labelledby="hlasy" className="flex flex-col gap-3.5">
      <SectionHeading id="hlasy" title="Co pro nás tábor znamená" color="magenta" small />
      <div className="grid items-start gap-3 md:grid-cols-3">
        {quotes.map((quote, i) => (
          <figure key={quote.name} className="flex flex-col gap-3.5 rounded-20 bg-surface p-5">
            <span
              aria-hidden="true"
              className="relative -top-2.5 h-6.5 text-44 leading-none font-bold text-magenta-ink"
            >
              „
            </span>
            <blockquote className="text-16 leading-relaxed md:text-17">{quote.text}</blockquote>
            <figcaption className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={clsx(
                  "flex size-9 flex-none items-center justify-center rounded-full font-bold",
                  AVATARS[i % AVATARS.length],
                )}
              >
                {initial(quote.name)}
              </span>
              <strong>{quote.name}</strong>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
