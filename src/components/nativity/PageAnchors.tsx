/**
 * "Na této stránce" (design/DESIGN.md §30.2): anchor pills to the blocks of the page's state, in their order; on
 * mobile one row that scrolls sideways to the screen edges.
 */
export function PageAnchors({ anchors }: { anchors: { id: string; label: string }[] }) {
  return (
    <nav aria-labelledby="na-teto-strance" className="flex flex-col gap-2">
      <span id="na-teto-strance" className="text-13 font-bold text-muted">
        Na této stránce
      </span>
      <ul className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:py-0">
        {anchors.map((a) => (
          <li key={a.id} className="flex-none">
            <a
              href={`#${a.id}`}
              className="flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 text-15 font-bold whitespace-nowrap text-ink no-underline hover:border-orange hover:text-ink"
            >
              {a.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
