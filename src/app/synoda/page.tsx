import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ExternalLinkIcon, FileIcon } from "@/components/ui/icons";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { links } from "@/content/site";
import { externalLinkAttrs, NEW_TAB } from "@/lib/shared/links";

const lead = "Synodální proces katolické církve „Synoda o synodalitě“ a jeho diecézní fáze v naší farnosti.";

export const metadata: Metadata = {
  title: "Synoda 2021–2023",
  description: `${lead} Leták, tematické okruhy a výstupy diecézí.`,
};

const UPLOADS = "/uploads/synoda";

const files = [
  { label: "Leták", href: `${UPLOADS}/synoda-letak.pdf` },
  { label: "Deset tématických okruhů", href: `${UPLOADS}/synoda-deset-tematickych-okruhu.pdf` },
];

/** The final syntheses of the Czech and Moravian dioceses (the old page's list). */
const syntheses = [
  {
    label: "Syntéza výstupů presynodálních skupin (Arcibiskupství pražské)",
    href: "https://drive.google.com/file/d/1ozTFd2qDJRbJFX6kXsIHLKnvF594SqeB/view",
  },
  {
    label: "Diecézní synodální syntéza (Biskupství královéhradecké)",
    href: "https://www.bihk.cz/sites/default/files/ke-stazeni/2022/05/diecezni_synodalni_synteza_hradec_kralove-20220430.pdf",
  },
  {
    label: "Syntéza diecézní fáze synodálního procesu (Biskupství českobudějovické)",
    href: "https://www.bcb.cz/wp-content/uploads/2022/05/synteza-diecezni-faze-synodalniho-procesu.pdf",
  },
  {
    label: "Syntéza výstupů z diecézní fáze synodálního procesu (Biskupství litoměřické)",
    href: "https://www.dltm.cz/file/180581/synteza-vystupu-z-diecezni-faze-synodalniho-procesu-litomericka-dieceze.pdf",
  },
  { label: "Synodální syntéza plzeňské diecéze (Biskupství plzeňské)", href: "https://www.bip.cz/synodalni_synteza" },
  {
    label: "Syntéza diecézní fáze Synody o synodalitě (Arcidiecéze olomoucká)",
    href: "https://www.ado.cz/wp-content/uploads/2022/05/synteza-diecezniho-synodalniho-procesu-olomouc.pdf",
  },
  {
    label:
      "Shrnutí výstupů synodálního procesu za brněnskou diecézi „Jaké budou naše farnosti, taková bude celá církev.“",
    href: "https://www.biskupstvi.cz/storage/akt/synoda-Brno.pdf",
  },
  {
    label: "Synodální proces v ostravsko-opavské diecézi 2021–2022",
    href: "https://farnostmh.cz/wp-content/uploads/2022/05/Synodalni_proces_doo.pdf",
  },
];

/** A file or a link of the page as a row with its icon. */
function LinkRow({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a
      href={href}
      {...externalLinkAttrs(href)}
      className="flex h-full min-h-14 items-center gap-3 rounded-14 bg-surface px-4 py-2.5 text-ink no-underline hover:bg-blue-tint hover:text-ink md:px-4.5"
    >
      {icon}
      {children}
    </a>
  );
}

/** Synoda 2021–2023 (no mockup): the old page's texts, the parish's files and the dioceses' syntheses. */
export default function SynodPage() {
  return (
    <>
      <SiteHeader currentHref={links.synod} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-5 pt-5 pb-12 md:gap-6 md:pt-7 md:pb-14 lg:gap-8 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Synoda 2021–2023" color="blue" size="standard" intro={lead} />

        <section aria-labelledby="informace" className="flex max-w-170 flex-col gap-4">
          <SectionHeading id="informace" title="Informace" color="blue" small />
          <ul className="flex flex-col gap-2 md:flex-row md:flex-wrap">
            {files.map((file) => (
              <li key={file.href}>
                <LinkRow href={file.href} icon={<FileIcon size={20} className="shrink-0 text-blue-ink" />}>
                  <span className="flex flex-col leading-card">
                    <strong>{file.label}</strong>
                    <span className="text-13 text-muted md:text-14">PDF</span>
                  </span>
                </LinkRow>
              </li>
            ))}
          </ul>
          <div className="rich-text text-15 text-ink-2">
            <p>
              Více o synodě najdete na webu{" "}
              <a href="https://www.cirkev.cz/cs/synoda-2021-2023" {...NEW_TAB} className="font-bold">
                cirkev.cz
              </a>
              .
            </p>
            <p>
              V naší farnosti se naše skupinka nerozešla s koncem diecézní synodní fáze. Scházíme se dál a pokračujeme v
              návrhu, přípravě a realizaci vizí, které jsme objevili. Máte-li zájem se přidat, stačí napsat na mail{" "}
              <a href="mailto:jana.nem@email.cz" className="font-bold">
                jana.nem@email.cz
              </a>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="synoda-pokracuje" className="flex max-w-170 flex-col gap-4">
          <SectionHeading id="synoda-pokracuje" title="Synoda pokračuje" color="blue" small />
          <div className="rich-text text-15 text-ink-2">
            <p>
              Ve dnech 9. a 10. října 2021 zahájil papež František tříletý synodální proces rozdělený do tří fází:
              diecézní, kontinentální a univerzální. Tento synodální proces vyvrcholí shromážděním Biskupské synody v
              říjnu 2023 v Římě.
            </p>
            <p>
              V současnosti se nacházíme v závěru diecézní fáze Synody. Po schválení syntézy jednotlivých výstupů z
              dotazníků farností diecézním biskupem dojde k odeslání finálních verzí za diecézi Národnímu synodálnímu
              týmu. Dne 6. července 2022 se uskuteční presynodní setkání české katolické církve na Velehradě s
              prezentací a připomínkováním národní syntézy. Dojde k finální úpravě národní syntézy dle připomínek z
              presynodního setkání na Velehradě. Tato národní syntéza bude odeslána do 15. srpna 2022 na Generální
              sekretariát Synody biskupů. Poté bude vypracováno první Instrumentum laboris (tj. pracovní, předběžný
              dokument k diskuzi), který bude zveřejněn a rozeslán partikulárním církvím, tj. diecézím, potažmo
              farnostem, kde bude možnost tento provizorní pracovní dokument (v duchu duchovního rozlišování)
              připomínkovat. Na tuto událost navazuje kontinentální fáze, která je naplánována od září 2022 do března
              2023, a jejím úkolem bude vést dialog o Instrumentum laboris. Synodální proces vyvrcholí v říjnu 2023
              slavením shromáždění biskupů v Římě podle postupů stanovených v apoštolské konstituci{" "}
              <a
                href="https://www.vatican.va/content/francesco/en/apost_constitutions/documents/papa-francesco_costituzione-ap_20180915_episcopalis-communio.html"
                {...NEW_TAB}
                className="font-bold"
              >
                Episcopalis Communio
              </a>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="vystupy" className="flex flex-col gap-4">
          <SectionHeading id="vystupy" title="Finální výstupy diecézní fáze" color="blue" small />
          <ul className="grid gap-2 md:grid-cols-2">
            {syntheses.map((synthesis) => (
              <li key={synthesis.href} className="min-w-0">
                <LinkRow href={synthesis.href} icon={<ExternalLinkIcon size={20} className="shrink-0 text-blue-ink" />}>
                  <span className="text-15 leading-card font-bold">
                    {synthesis.label}
                    <span className="sr-only"> (otevře se v novém okně)</span>
                  </span>
                </LinkRow>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
