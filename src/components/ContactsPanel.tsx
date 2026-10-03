import { clsx } from "clsx";
import type { ReactNode } from "react";
import { contacts, links } from "@/content/site";
import { ButtonLink } from "./ButtonLink";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "./icons";
import { SectionHeading } from "./SectionHeading";

const tel = (phone: string) => `tel:+420${phone.replace(/\s/g, "")}`;

function Row({ icon, className, children }: { icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div
      className={clsx(
        "flex gap-3 border-blue-line py-3.5 max-lg:not-first:border-t md:py-2.5 lg:py-0 [&>svg]:mt-0.5 [&>svg]:flex-none [&>svg]:text-blue-ink lg:[&>svg]:mt-0.75",
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
}

/*
 * Mobile: heading outside the tinted list, outline button below.
 * Tablet: the whole section is the tinted panel.
 * Desktop: panel with rows in a 2-column grid and the link in the heading.
 */
export function ContactsPanel() {
  return (
    <section
      aria-labelledby="kontakty"
      className="flex flex-col gap-4 md:gap-1 md:rounded-28 md:bg-blue-tint md:px-6 md:py-7 lg:gap-4 lg:rounded-32 lg:px-8 lg:py-9"
    >
      <SectionHeading
        id="kontakty"
        title="Kontakty"
        color="blue"
        compact
        linkDesktopOnly
        link={{ href: links.contacts, label: "Všechny kontakty" }}
        className="md:pb-2 lg:pb-0"
      />
      <address className="flex flex-col rounded-24 bg-blue-tint px-5 py-2 not-italic md:gap-1 md:rounded-none md:bg-transparent md:p-0 md:text-15 lg:grid lg:grid-fit-200 lg:gap-x-6 lg:gap-y-4 lg:text-16">
        <Row icon={<PinIcon />} className="lg:order-1">
          {/* Tablet condenses address, phones and hours to single lines (design/mockups/home/light/tablet-834). */}
          <span>
            {contacts.street}
            <br className="md:hidden lg:inline" />
            <span className="hidden md:inline lg:hidden">, </span>
            {contacts.city}
          </span>
        </Row>
        <Row icon={<PhoneIcon />} className="lg:order-3">
          <span className="flex flex-col md:flex-row md:flex-wrap md:gap-x-3 lg:flex-col">
            {contacts.phones.map((phone) => (
              <a key={phone} href={tel(phone)} className="font-bold">
                {phone}
              </a>
            ))}
          </span>
        </Row>
        <Row icon={<MailIcon />} className="lg:order-4">
          <a href={`mailto:${contacts.email}`} className="font-bold">
            {contacts.email}
          </a>
        </Row>
        <Row icon={<ClockIcon />} className="lg:order-2">
          <span className="flex flex-col">
            <strong>Úřední hodiny</strong>
            <span>
              {contacts.officeHours.map(({ time, note }, i) => (
                <span key={time} className="block md:inline lg:block">
                  {i > 0 && <span className="hidden md:inline lg:hidden">, </span>}
                  {time}
                  {/* Per the design, the note shows on mobile only and "jindy dle domluvy" not on desktop. */}
                  {note && <span className="md:hidden"> ({note})</span>}
                </span>
              ))}
            </span>
            <span className="text-muted lg:hidden">{contacts.officeHoursOther}</span>
          </span>
        </Row>
      </address>
      <ButtonLink href={links.contacts} variant="outline" className="md:mt-auto lg:hidden">
        Všechny kontakty
      </ButtonLink>
    </section>
  );
}
