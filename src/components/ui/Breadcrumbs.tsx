export type Crumb = { label: string; href: string };

/** "Úvod › Aktuality › <current>": links to the parents, then the current page. */
export function Breadcrumbs({ parents, current }: { parents: Crumb[]; current: string }) {
  return (
    <nav aria-label="Drobečková navigace" className="text-14 text-muted md:text-15">
      <ol className="flex flex-wrap items-center gap-1.5">
        {parents.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <a href={crumb.href}>{crumb.label}</a>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
