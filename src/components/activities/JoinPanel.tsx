import { links } from "@/content/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { MailIcon } from "@/components/ui/icons/contact-icons";

/** "Chcete se zapojit?" (design/DESIGN.md §25): the closing invitation, leading to Kontakty. */
export function JoinPanel() {
  return (
    <section
      aria-labelledby="zapojit-se"
      className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 overflow-hidden rounded-24 bg-green-tint p-5 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-14 bg-green shard-tr" />
      <div className="flex max-w-160 flex-col gap-1 pr-10">
        <h2 id="zapojit-se" className="text-21 font-bold md:text-22 lg:text-24">
          Chcete se zapojit?
        </h2>
        <p className="text-ink-2">
          Ozvěte se kontaktní osobě po mši, nebo napište na faru – rádi vás propojíme. U aktivit označených „hledáme“
          uvítáme nové lidi.
        </p>
      </div>
      <ButtonLink href={links.contacts} variant="green" size="small">
        <MailIcon size={18} />
        Napsat na faru
      </ButtonLink>
    </section>
  );
}
