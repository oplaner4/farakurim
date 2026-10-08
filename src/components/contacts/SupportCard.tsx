import { CopyButton } from "@/components/ui/CopyButton";
import { links, parish } from "@/content/site";
import { ContactCard } from "./ContactCard";
import { ArrowLink } from "@/components/ui/ArrowLink";

/** "Podpora farnosti" (§15.1): the bank account with a copy button and the link to Finanční podpora (§22). */
export function SupportCard() {
  return (
    <ContactCard id="podpora-farnosti" title="Podpora farnosti" tone="orange">
      <span aria-hidden="true" className="absolute right-0 bottom-0 h-15 w-22.5 bg-orange shard-br" />
      <p className="text-15 text-ink-2">Bankovní účet farnosti</p>
      <div className="relative flex flex-col items-start gap-2.5">
        <strong className="text-24">{parish.bankAccount}</strong>
        <CopyButton text={parish.bankAccount} />
      </div>
      <ArrowLink href={links.support} tone="orange" className="relative self-start">
        Projekty a další možnosti podpory
      </ArrowLink>
    </ContactCard>
  );
}
