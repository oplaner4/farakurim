import type { ParishCouncil } from "@/content/types/parish";
import { formatNumericDate } from "@/lib/shared/czech";
import { MailIcon } from "@/components/ui/icons/contact-icons";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** The initials of a name without its titles ("Mgr. Eva Fialová" → "EF"). */
const initials = (name: string) =>
  name
    .split(" ")
    .filter((word) => !word.endsWith("."))
    .map((word) => word.charAt(0))
    .join("");

/** Pastorační rada – členové: the term of office, the members as name cards and the council's e-mail. */
export function CouncilMembers({ council }: { council: ParishCouncil }) {
  return (
    <section aria-labelledby="clenove" className="flex flex-col gap-3.5">
      <SectionHeading id="clenove" title="Členové" color="blue" small />
      <p className="text-15 text-ink-2">
        Funkční období {formatNumericDate(council.term.from)} – {formatNumericDate(council.term.to)}
      </p>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {council.members.map((name) => (
          <li key={name} className="flex min-h-15 items-center gap-3.5 rounded-18 bg-surface px-4 py-3">
            <span
              aria-hidden="true"
              className="flex size-11 flex-none items-center justify-center rounded-12 bg-blue-tint text-17 font-bold text-blue-ink"
            >
              {initials(name)}
            </span>
            <strong className="text-17 leading-card">{name}</strong>
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${council.email}`}
        className="flex min-h-14 items-center gap-3 self-start rounded-14 bg-surface px-4 text-ink no-underline hover:bg-blue-tint hover:text-ink md:px-4.5"
      >
        <MailIcon size={20} className="shrink-0 text-blue-ink" />
        <span className="flex min-w-0 flex-col leading-card">
          <strong>E-mail pastorační rady</strong>
          <span className="text-14 break-all text-muted">{council.email}</span>
        </span>
      </a>
    </section>
  );
}
