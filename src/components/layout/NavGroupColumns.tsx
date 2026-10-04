import { clsx } from "clsx";
import { cva } from "class-variance-authority";
import { navGroups } from "@/content/site";
import { GroupShard } from "./GroupShard";
import { NavGroupLink } from "./NavGroupLink";

const grid = cva("grid grid-cols-4 gap-5", {
  variants: { place: { menu: "lg:gap-8", footer: "lg:gap-6" } },
});

const heading = cva("mb-1 flex items-center gap-2.5 text-16 font-bold", {
  variants: { place: { menu: "lg:text-18", footer: "" } },
});

const link = cva("min-h-10 text-15 leading-card", {
  variants: { place: { menu: "lg:text-16", footer: "lg:min-h-9" } },
});

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
            <GroupShard color={group.color} />
            {group.title}
          </h2>
          <ul className="flex flex-col">
            {group.links.map((item) => (
              <li key={item.href}>
                <NavGroupLink
                  href={item.href}
                  color={group.color}
                  currentHref={currentHref}
                  className={link({ place })}
                >
                  {item.label}
                </NavGroupLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
