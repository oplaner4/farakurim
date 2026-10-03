import { links } from "@/content/site";
import { ArrowRightIcon } from "./icons";

/** "Archiv aktualit": a text link on mobile, a blue outline button from tablet up. */
export function NewsArchivePanel() {
  return (
    <section
      aria-labelledby="archiv-aktualit"
      className="flex flex-col gap-2.5 rounded-24 bg-surface px-5 py-5.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-3 md:rounded-28 md:px-7 md:py-6 lg:gap-x-8 lg:gap-y-4 lg:rounded-32 lg:px-9 lg:py-8"
    >
      <div className="max-md:contents md:flex md:flex-col md:gap-1">
        <h2 id="archiv-aktualit" className="text-20 font-bold md:text-22 lg:text-28">
          Archiv aktualit
        </h2>
        <p className="text-15 text-ink-2 md:text-16 lg:text-17">Starší pozvánky a ohlédnutí za proběhlými akcemi.</p>
      </div>
      <a
        href={links.newsArchive}
        className="flex min-h-11 items-center gap-1.5 self-start font-bold md:min-h-13 md:self-auto md:rounded-14 md:border-2 md:border-blue md:px-5 md:no-underline md:hover:bg-blue md:hover:text-white lg:min-h-14 lg:px-6"
      >
        Otevřít archiv
        <ArrowRightIcon size={18} className="md:hidden" />
      </a>
    </section>
  );
}
