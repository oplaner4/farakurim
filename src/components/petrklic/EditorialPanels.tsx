import { ButtonLink } from "@/components/ui/ButtonLink";
import { MailIcon } from "@/components/ui/icons/contact-icons";

type Props = {
  email: string;
  editors: string[];
  coverDesign: string;
};

/*
 * "Napište do Petrklíče" and "Redakce" (design/DESIGN.md §17.1 (5)–(6)): stacked on mobile, side by side from
 * tablet up.
 */
export function EditorialPanels({ email, editors, coverDesign }: Props) {
  return (
    <div className="flex flex-col gap-7 md:grid md:grid-cols-2 md:gap-4 lg:gap-6">
      <section
        aria-labelledby="napiste"
        className="relative flex flex-col gap-3 overflow-hidden rounded-24 bg-blue-tint p-5 md:p-6 lg:p-7"
      >
        <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-blue shard-tr" />
        <h2 id="napiste" className="pr-12 text-20 leading-heading font-bold md:text-22 lg:text-24">
          Napište do Petrklíče
        </h2>
        <p className="text-ink-2">Články a příspěvky do zpravodaje posílejte e-mailem redakci.</p>
        <ButtonLink href={`mailto:${email}`} size="block" className="min-h-12 self-start px-4.5">
          <MailIcon />
          {email}
        </ButtonLink>
      </section>
      <section aria-labelledby="redakce" className="flex flex-col gap-3 rounded-24 bg-surface p-5 md:p-6 lg:p-7">
        <h2 id="redakce" className="text-20 leading-heading font-bold md:text-22 lg:text-24">
          Redakce
        </h2>
        <ul className="flex flex-wrap gap-2">
          {editors.map((name) => (
            <li key={name} className="rounded-full bg-raised px-3 py-1.5 text-15">
              {name}
            </li>
          ))}
        </ul>
        <p className="text-15 text-ink-2">
          Grafika obálky: <strong className="text-ink">{coverDesign}</strong>
        </p>
      </section>
    </div>
  );
}
