import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import type { ContactPerson } from "@/content/types/activities";
import { initials } from "@/lib/activities/people";
import { telHref } from "@/lib/shared/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CopyButton } from "@/components/ui/CopyButton";
import { MailIcon, PhoneIcon } from "@/components/ui/icons/contact-icons";

const card = cva(
  "relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-24 p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7",
  { variants: { tone: { blue: "bg-blue-tint-alt", green: "bg-green-tint" } } },
);

const accents = {
  blue: { shard: "bg-blue", ink: "text-blue-ink", call: "primary", write: "outline" },
  green: { shard: "bg-green", ink: "text-green-ink", call: "green", write: "outline-green" },
} as const;

/** The e-mail's subject, so the leaders see at once what it is about. */
const SUBJECT = encodeURIComponent("Farní tábor");

/**
 * A contact person on Tábor – Kontakt (design/DESIGN.md §29.4): initials, name and role, the phone and e-mail
 * (with the subject "Farní tábor"), "Zkopírovat e-mail" and the Zavolat / Napsat e-mail buttons, in the card's tint.
 */
export function CampContactCard({ person, tone }: { person: ContactPerson; tone: "blue" | "green" }) {
  const accent = accents[tone];
  const mailto = person.email && `mailto:${person.email}?subject=${SUBJECT}`;
  return (
    <li className={card({ tone })}>
      <span aria-hidden="true" className={clsx("absolute top-0 right-0 size-14 shard-tr", accent.shard)} />
      <div className="flex items-center gap-3.5 pr-10">
        <span
          aria-hidden="true"
          className={clsx(
            "flex size-14 flex-none items-center justify-center rounded-full bg-raised text-20 font-bold",
            accent.ink,
          )}
        >
          {initials(person.name)}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-22 leading-heading font-bold lg:text-26">{person.name}</h2>
          <span className={clsx("text-13 font-bold tracking-caps uppercase", accent.ink)}>{person.role}</span>
        </div>
      </div>
      <dl className="flex flex-col gap-3">
        {person.phone && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-13 text-muted">Telefon</dt>
            <dd>
              <a href={telHref(person.phone)} className="text-20 font-bold">
                +420 {person.phone}
              </a>
            </dd>
          </div>
        )}
        {person.email && mailto && (
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-13 text-muted">E-mail</dt>
            <dd className="min-w-0 wrap-anywhere">
              <a href={mailto} className="text-17 font-bold">
                {person.email}
              </a>
            </dd>
            <dd className="mt-1.5">
              <CopyButton text={person.email} label="Zkopírovat e-mail" tone={tone} size="small" width="email" />
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap gap-2">
        {person.phone && (
          <ButtonLink href={telHref(person.phone)} variant={accent.call} size="small" className="grow basis-35">
            <PhoneIcon size={18} />
            Zavolat
          </ButtonLink>
        )}
        {mailto && (
          <ButtonLink href={mailto} variant={accent.write} size="small" className="grow basis-40">
            <MailIcon size={18} />
            Napsat e-mail
          </ButtonLink>
        )}
      </div>
    </li>
  );
}
