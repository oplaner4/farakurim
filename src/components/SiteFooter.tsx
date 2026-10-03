import { links, parish } from "@/content/site";
import { ColorStripe } from "./ColorStripe";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface">
      <ColorStripe />
      <div className="container-page flex flex-col gap-4 pt-8 pb-10 md:flex-row md:items-center md:justify-between md:gap-x-8 lg:pt-9 lg:pb-11">
        <div className="grid shrink-0 grid-cols-[auto_1fr] items-center gap-x-3 gap-y-4 md:gap-y-0">
          <img
            src="/assets/img/logo-farnost-kurim.svg"
            alt=""
            width={421}
            height={681}
            className="h-10 w-6.25 md:row-span-2"
          />
          <span className="font-bold">{parish.name}</span>
          <span className="col-span-2 text-14 text-ink-2 md:col-span-1 md:col-start-2">
            {parish.villages.join(" · ")}
          </span>
        </div>
        <div className="flex flex-col gap-4 text-14 text-ink-2 md:flex-row md:flex-wrap md:items-center md:gap-x-7 md:gap-y-2 md:text-15">
          <span>Bankovní účet: {parish.bankAccount}</span>
          <a href={links.virtualTour} className="font-bold">
            Virtuální prohlídka kostela
          </a>
        </div>
      </div>
    </footer>
  );
}
