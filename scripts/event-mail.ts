// pnpm event-mail: reads the events mailbox over IMAP for the events workflow (only that workflow runs it). `fetch`
// judges the unseen messages (sender, DKIM, an attachment or a subject and a text), writes the oldest event mail's
// subject, text and attachments under <dir> and prints the outcome as one JSON document on stdout (diagnostics go to
// stderr); it moves nothing and marks nothing seen. `file` moves the messages to `Zpracováno` (processed) or
// `Odmítnuto` (rejected).
//
// Usage: pnpm --silent event-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>
// The login comes from IMAP_HOST, IMAP_USER and IMAP_PASSWORD.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/event-mail";

runCommand("event-mail", import.meta.url, parseCommand, execute);
