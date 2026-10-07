import { clsx } from "clsx";
import { navGroups } from "@/content/site";
import { ChevronDownIcon } from "@/components/ui/icons/navigation-icons";
import { GroupShard } from "./GroupShard";
import { NavGroupLink } from "./NavGroupLink";

/**
 * The secondary-page groups as collapsible `<details>` on mobile (design/DESIGN.md §20.2–20.3), used by the
 * menu drawer and the footer. All are collapsed except the one holding the current page.
 */
export function NavGroupAccordions({
  label,
  currentHref,
  className,
}: {
  label?: string;
  currentHref?: string;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col border-b border-line", className)}>
      {label && <span className="px-1 pb-1.5 text-13 font-bold tracking-caps text-muted uppercase">{label}</span>}
      {navGroups.map((group) => (
        <details
          key={group.title}
          open={group.links.some((item) => item.href === currentHref)}
          className="group/accordion border-t border-line"
        >
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-2.5 px-1 text-17 font-bold">
            <span className="flex items-center gap-2.5">
              <GroupShard color={group.color} />
              {group.title}
            </span>
            <ChevronDownIcon className="flex-none transition-transform group-open/accordion:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="flex flex-col pr-1 pb-3 pl-6.5">
            {group.links.map((item) => (
              <li key={item.href}>
                <NavGroupLink
                  href={item.href}
                  color={group.color}
                  currentHref={currentHref}
                  className="min-h-11 text-16"
                >
                  {item.label}
                </NavGroupLink>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
