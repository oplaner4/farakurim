import { clsx } from "clsx";
import { cva } from "class-variance-authority";
import { navGroups } from "@/content/site";
import { externalLinkAttrs } from "@/lib/links";
import { groupStyles } from "./nav-group-styles";

const grid = cva("grid grid-cols-4 gap-5", {
  variants: { place: { menu: "lg:gap-8", footer: "lg:gap-6" } },
});

const heading = cva("mb-1 flex items-center gap-2.5 text-16 font-bold", {
  variants: { place: { menu: "lg:text-18", footer: "" } },
});

const link = cva(
  "flex min-h-10 items-center text-15 leading-card text-ink no-underline hover:text-blue-ink aria-[current=page]:font-bold",
  { variants: { place: { menu: "lg:text-16", footer: "lg:min-h-9" } } },
);

/**
 * The secondary-page groups as four columns (design/DESIGN.md §20): the tablet drawer and desktop "Více" panel
 * (`menu`), and the sitemap footer from tablet up (`footer`). Mobile shows `NavGroupAccordions` instead.
 */
export function NavGroupColumns({
  place,
  currentHref,
  className,
}: {
  place: "menu" | "footer";
  currentHref?: string;
  className?: string;
}) {
  return (
    <div className={clsx(grid({ place }), className)}>
      {navGroups.map((group) => (
        <div key={group.title} className="flex min-w-0 flex-col gap-1.5">
          <h2 className={heading({ place })}>
            <span aria-hidden="true" className={clsx("h-4 w-3 flex-none shard-br", groupStyles[group.color].shard)} />
            {group.title}
          </h2>
          <ul className="flex flex-col">
            {group.links.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={item.href === currentHref ? "page" : undefined}
                  className={clsx(link({ place }), groupStyles[group.color].current)}
                  {...externalLinkAttrs(item.href)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
