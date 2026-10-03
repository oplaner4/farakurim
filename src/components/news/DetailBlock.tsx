import { clsx } from "clsx";
import type { ReactNode } from "react";

/** A content block of the event detail (§13.2): O akci, Program, highlights, Přílohy. */
export function DetailBlock({
  id,
  title,
  className,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={clsx("flex flex-col gap-3 lg:gap-3.5", className)}>
      <h2 id={id} className="text-22 leading-heading font-bold md:text-26 lg:text-28">
        {title}
      </h2>
      {children}
    </section>
  );
}
