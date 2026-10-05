import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import type { ReligiousEducation } from "@/content/types/activities";
import { initials } from "@/lib/activities/people";
import { telHref } from "@/lib/shared/links";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FileDownloadIcon, FileIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";

const card = cva("flex min-w-0 flex-col gap-3 rounded-24 p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7", {
  variants: {
    tone: {
      /* Přihláška: room for the corner shard. */
      green: "relative overflow-hidden bg-green-tint",
      surface: "bg-surface",
    },
  },
});

function Card({
  id,
  title,
  tone,
  children,
}: {
  id: string;
  title: string;
  tone: "green" | "surface";
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={card({ tone })}>
      {tone === "green" && <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-green shard-tr" />}
      <h2 id={id} className="pr-12 text-21 font-bold md:text-22 lg:text-24">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The three cards under the timetable (design/DESIGN.md §24): Přihláška, Kontakt and Omlouvání; three columns on
 * desktop, two on tablet, stacked on mobile.
 */
export function EducationCards({ education }: { education: ReligiousEducation }) {
  const { contact } = education;
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
      <Card id="prihlaska" title="Přihláška" tone="green">
        <p className="text-15 text-ink-2">
          Dítě přihlásíte vyplněnou přihláškou, kterou odevzdáte vyučujícímu nebo na faře. Přihláška platí pro celý
          školní rok.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={education.applicationForm} variant="green" size="small">
            <FileDownloadIcon size={18} />
            Přihláška do náboženství
          </ButtonLink>
          <ButtonLink href={education.rules} variant="outline-green" size="small">
            <FileIcon size={18} />
            Zásady výuky (PDF)
          </ButtonLink>
        </div>
      </Card>
      <Card id="kontakt" title="Kontakt" tone="surface">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-13 flex-none items-center justify-center rounded-full bg-green-tint text-18 font-bold text-green-ink"
          >
            {initials(contact.name)}
          </span>
          <span className="flex flex-col leading-card">
            <strong className="text-17">{contact.name}</strong>
            <span className="text-14 text-muted">{contact.role}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {contact.phone && (
            <ButtonLink href={telHref(contact.phone)} variant="outline-neutral" size="small">
              <PhoneIcon size={18} />
              Zavolat
            </ButtonLink>
          )}
          {contact.email && (
            <ButtonLink href={`mailto:${contact.email}`} variant="outline-neutral" size="small">
              <MailIcon size={18} />
              Napsat e-mail
            </ButtonLink>
          )}
        </div>
        {contact.phone && (
          <p className="text-14 text-muted">
            Telefon {contact.phone}
            {contact.phoneNote && ` (${contact.phoneNote})`}
          </p>
        )}
      </Card>
      <Card id="omlouvani" title="Omlouvání" tone="surface">
        <p className="text-15 text-ink-2">
          Když dítě do náboženství nemůže přijít, je nutné ho omluvit – vyučujícímu nebo pastorační asistentce.
          Podrobnosti najdete v{" "}
          <a href={education.rules} className="font-bold">
            zásadách výuky
          </a>
          .
        </p>
      </Card>
    </div>
  );
}
