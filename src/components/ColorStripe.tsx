import { clsx } from "clsx";

/** The 4-colour band from the logo (green, blue, magenta, orange at 3 : 2 : 2 : 3). */
export function ColorStripe({ className }: { className?: string }) {
  return (
    <div className={clsx("flex h-1.5", className)} aria-hidden="true">
      <span className="flex-3 bg-green" />
      <span className="flex-2 bg-blue" />
      <span className="flex-2 bg-magenta" />
      <span className="flex-3 bg-orange" />
    </div>
  );
}
