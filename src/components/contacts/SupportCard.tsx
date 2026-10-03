import { parish } from "@/content/site";
import { ContactCard } from "./ContactCard";
import { CopyButton } from "./CopyButton";

/** "Podpora farnosti" (§15.1): the bank account with a copy button. */
export function SupportCard() {
  return (
    <ContactCard id="podpora-farnosti" title="Podpora farnosti" tone="orange">
      <span aria-hidden="true" className="absolute right-0 bottom-0 h-15 w-22.5 bg-orange shard-br" />
      <p className="text-15 text-ink-2">Bankovní účet farnosti</p>
      <div className="relative flex flex-wrap items-center gap-3">
        <strong className="text-24">{parish.bankAccount}</strong>
        <CopyButton text={parish.bankAccount} />
      </div>
    </ContactCard>
  );
}
