// The two actions every mailbox command has: `fetch` (judge the unseen mail, print the outcome as JSON) and `file`
// (move the handled messages to `Zpracováno` or `Odmítnuto`).

import { fileMessages, imapEnv, imapMailbox, uidList, type Mailbox } from "./imap";

export type MailboxCommand =
  { action: "fetch"; out: string } | { action: "file"; processed: number[]; rejected: number[] };

/** The command-line options of the two actions, for parseCommandLine(). */
export const MAILBOX_OPTIONS = {
  out: { type: "string" },
  processed: { type: "string" },
  rejected: { type: "string" },
} as const;

/** `fetch --out <dir>` or `file --processed <uids> --rejected <uids>`; undefined for another action. */
export function mailboxCommand(
  action: string | undefined,
  values: { out?: string; processed?: string; rejected?: string },
  usage: string,
): MailboxCommand | undefined {
  if (action === "fetch") {
    if (!values.out) throw new Error(`fetch needs --out\n${usage}`);
    return { action, out: values.out };
  }
  if (action === "file") {
    return { action, processed: uidList(values.processed, usage), rejected: uidList(values.rejected, usage) };
  }
  return undefined;
}

/**
 * Runs the command on the mailbox of IMAP_HOST, IMAP_USER and IMAP_PASSWORD: `fetch` prints what `fetchOutcome`
 * gives as one JSON document on stdout, `file` moves the messages. The mailbox is closed either way.
 */
export async function runMailboxCommand(
  command: MailboxCommand,
  fetchOutcome: (mailbox: Mailbox, out: string) => Promise<unknown>,
): Promise<void> {
  const mailbox = await imapMailbox(imapEnv());
  try {
    if (command.action === "fetch") {
      console.log(JSON.stringify(await fetchOutcome(mailbox, command.out)));
    } else {
      await fileMessages(mailbox, command);
      console.error(`Filed ${command.processed.length} processed and ${command.rejected.length} rejected message(s)`);
    }
  } finally {
    await mailbox.close();
  }
}
