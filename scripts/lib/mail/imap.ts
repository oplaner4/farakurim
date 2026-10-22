// The content mailboxes over IMAP: their unseen messages, oldest first, and filing them in `Zpracováno` or
// `Odmítnuto` once their outcome is done. Nothing here marks a message seen.

import { ImapFlow } from "imapflow";

/** The folder of the messages that are done and the folder of the ones refused. */
export const PROCESSED_FOLDER = "Zpracováno";
export const REJECTED_FOLDER = "Odmítnuto";

export type Mailbox = {
  /** The unseen messages of the inbox with their raw source, oldest first. */
  unseen(): Promise<{ uid: number; source: Buffer }[]>;
  move(uids: number[], folder: string): Promise<void>;
  close(): Promise<void>;
};

/** Moves the `processed` messages to Zpracováno and the `rejected` ones to Odmítnuto; an empty list moves nothing. */
export async function fileMessages(
  mailbox: Mailbox,
  { processed, rejected }: { processed: number[]; rejected: number[] },
): Promise<void> {
  if (processed.length) await mailbox.move(processed, PROCESSED_FOLDER);
  if (rejected.length) await mailbox.move(rejected, REJECTED_FOLDER);
}

/**
 * The inbox over IMAP (TLS, port 993). A thin adapter, not unit-tested: it creates the two folders when missing and
 * fetches the sources with BODY.PEEK, so no message is marked seen.
 */
export async function imapMailbox(env: { host: string; user: string; password: string }): Promise<Mailbox> {
  const client = new ImapFlow({
    host: env.host,
    port: 993,
    secure: true,
    auth: { user: env.user, pass: env.password },
    logger: false,
  });
  await client.connect();
  const existing = new Set((await client.list()).map((box) => box.path));
  for (const folder of [PROCESSED_FOLDER, REJECTED_FOLDER]) {
    if (!existing.has(folder)) await client.mailboxCreate(folder);
  }
  const lock = await client.getMailboxLock("INBOX");
  return {
    async unseen() {
      const uids = (await client.search({ seen: false }, { uid: true })) || [];
      if (!uids.length) return [];
      const found: { uid: number; source: Buffer }[] = [];
      for await (const message of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
        if (message.source) found.push({ uid: message.uid, source: message.source });
      }
      return found.sort((a, b) => a.uid - b.uid);
    },
    async move(uids, folder) {
      await client.messageMove(uids, folder, { uid: true });
    },
    async close() {
      lock.release();
      await client.logout();
    },
  };
}

/** The uids of a comma-separated list (`--processed 3,5`); anything else throws with `usage`. */
export function uidList(value: string | undefined, usage: string): number[] {
  return (value ?? "")
    .split(",")
    .filter(Boolean)
    .map((part) => {
      if (!/^[1-9]\d*$/.test(part)) throw new Error(`"${part}" is not a message uid\n${usage}`);
      return Number(part);
    });
}

/**
 * The IMAP login from IMAP_HOST, IMAP_USER and IMAP_PASSWORD; missing ones throw, naming them, and so does a host
 * that is a URL or carries a port (the DNS lookup would fail on it with a bare ENOTFOUND).
 */
export function imapEnv(env: Record<string, string | undefined> = process.env) {
  const missing = ["IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"].filter((name) => !env[name]);
  if (missing.length) throw new Error(`set ${missing.join(", ")}`);
  const host = env.IMAP_HOST!.trim();
  if (!/^[a-z0-9.-]+$/i.test(host)) {
    throw new Error("IMAP_HOST is a host name like mail.example.cz: no http://, no path, no port (993 is used)");
  }
  return { host, user: env.IMAP_USER!, password: env.IMAP_PASSWORD! };
}
