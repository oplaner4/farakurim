import type { ReactNode } from "react";
import type { EventAttachment, EventLink } from "@/content/types/news";
import { fileType, formatFileSize } from "@/lib/shared/czech";
import { externalLinkAttrs } from "@/lib/shared/links";
import { ExternalLinkIcon, FileIcon } from "@/components/ui/icons";
import { DetailBlock } from "./DetailBlock";

type FileRowProps = { href: string; label: string; detail: string; icon: ReactNode };

function FileRow({ href, label, detail, icon }: FileRowProps) {
  return (
    <li>
      <a
        href={href}
        {...externalLinkAttrs(href)}
        className="flex min-h-14 items-center gap-3 rounded-14 bg-surface px-4 text-ink no-underline hover:bg-magenta-tint hover:text-ink md:px-4.5 lg:min-h-15 lg:gap-3.5 lg:rounded-16 lg:px-5"
      >
        {icon}
        <span className="flex flex-col leading-card">
          <strong>{label}</strong>
          <span className="text-13 text-muted md:text-14">{detail}</span>
        </span>
      </a>
    </li>
  );
}

/** "Přílohy" / "Odkazy" / "Přílohy a odkazy": files first, then external links and e-mails. */
export function EventFiles({ attachments, links }: { attachments: EventAttachment[]; links: EventLink[] }) {
  const title = attachments.length === 0 ? "Odkazy" : links.length > 0 ? "Přílohy a odkazy" : "Přílohy";
  return (
    <DetailBlock id="prilohy" title={title}>
      <ul className="flex flex-col gap-2 md:items-start">
        {attachments.map((a) => (
          <FileRow
            key={a.file}
            href={a.file}
            {...externalLinkAttrs(a.file)}
            label={a.label}
            detail={a.size ? `${fileType(a.file)} · ${formatFileSize(a.size)}` : fileType(a.file)}
            icon={<FileIcon size={20} className="shrink-0 text-magenta-ink lg:size-5.5" />}
          />
        ))}
        {links.map((l) => (
          <FileRow
            key={l.href}
            href={l.href}
            {...externalLinkAttrs(l.href)}
            label={l.label}
            detail={l.href.startsWith("mailto:") ? "E-mail" : new URL(l.href).hostname}
            icon={<ExternalLinkIcon size={20} className="shrink-0 text-blue-ink lg:size-5.5" />}
          />
        ))}
      </ul>
    </DetailBlock>
  );
}
