import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UsersIcon } from "@/components/ui/icons/camp-icons";

const card = cva("relative flex flex-col gap-1.5 overflow-hidden rounded-20 p-5", {
  variants: {
    tone: {
      blue: "bg-blue-tint-alt",
      green: "bg-green-tint",
      orange: "bg-orange-tint",
    },
  },
});

const accents = {
  blue: { shard: "bg-blue", ink: "text-blue-ink" },
  green: { shard: "bg-green", ink: "text-green-ink" },
  orange: { shard: "bg-orange", ink: "text-orange-ink-deep" },
};

const groups = [
  { tone: "blue", label: "účastníci", title: "Děti do 15 let", text: "Mají svůj vlastní program, hry a výlety." },
  {
    tone: "green",
    label: "praktikanti",
    title: "Mládež 15–18 let",
    text: "Učí se vést tábor po boku vedoucích. Část programu je připravená přímo pro ně.",
  },
  {
    tone: "orange",
    label: "vedoucí",
    title: "Dospělí",
    text: "Připravují program, starají se o děti a tábor vedou.",
  },
] as const;

/**
 * "Pro koho je tábor" (design/DESIGN.md §29.2, 4): three tinted cards with a corner shard (1 / 3 / 3 columns) and
 * the note about the meeting of everyone before the summer.
 */
export function CampAudience() {
  return (
    <section aria-labelledby="pro-koho" className="flex flex-col gap-3.5">
      <SectionHeading id="pro-koho" title="Pro koho je tábor" color="magenta" small />
      <ul className="grid gap-2.5 md:grid-cols-3">
        {groups.map((g) => (
          <li key={g.label} className={card({ tone: g.tone })}>
            <span
              aria-hidden="true"
              className={clsx("absolute top-0 right-0 size-11 shard-tr", accents[g.tone].shard)}
            />
            <span className={clsx("text-13 font-bold tracking-caps uppercase", accents[g.tone].ink)}>{g.label}</span>
            <strong className="text-20 leading-snug">{g.title}</strong>
            <span className="text-15 text-ink-2">{g.text}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2.5 rounded-16 bg-surface px-4 py-3.5 text-15 text-ink-2">
        <UsersIcon size={20} className="mt-px flex-none text-magenta-ink" />
        <span>
          Před prázdninami se koná <strong className="text-ink">setkání všech účastníků</strong>, abychom se poznali
          ještě před odjezdem.
        </span>
      </p>
    </section>
  );
}
