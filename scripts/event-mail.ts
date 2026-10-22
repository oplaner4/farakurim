// pnpm event-mail: reads the events mailbox over IMAP for the events workflow (only that workflow runs it). `fetch`
// judges the unseen messages (sender, DKIM, an attachment or a subject and a text), writes the oldest event mail's
// subject, text and attachments under <dir> and prints the outcome as one JSON document on stdout (diagnostics go to
// stderr); it moves nothing and marks nothing seen. `file` moves the messages to `Zpracováno` (processed) or
// `Odmítnuto` (rejected). `known` writes the known events (the upcoming ones on main and those the open events PRs
// add) for the duplicate check, and `check-ids` refuses an event id the working tree adds that an open PR holds.
//
// Usage: pnpm --silent event-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>
//        pnpm event-mail known --out <known.json> | check-ids <known.json>
// The login comes from IMAP_HOST, IMAP_USER and IMAP_PASSWORD; `known` reads GITHUB_REPOSITORY and GH_TOKEN.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/event-mail";

runCommand("event-mail", import.meta.url, parseCommand, execute);
