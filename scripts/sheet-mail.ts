// pnpm sheet-mail: reads the parish's mailbox over IMAP for the service-sheet workflow (only that workflow runs it).
// `fetch` judges the unseen messages (sender, DKIM, one DOCX), writes the newest sheet's DOCX as <dir>/porad.docx and
// the mail's new text, if any, as <dir>/note.txt (the sender's note), and prints the outcome as one JSON document on
// stdout (diagnostics go to stderr): with `week` when a date in the subject names a week of the DOCX, `noWeek` when it
// names none. It moves nothing and marks nothing seen. `file` moves the messages to `Zpracováno` (processed) or `Odmítnuto` (rejected).
//
// Usage: pnpm --silent sheet-mail fetch --out <dir> | file --processed <uid,…> --rejected <uid,…>
// The login comes from IMAP_HOST, IMAP_USER and IMAP_PASSWORD.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/services/sheet-mail";

runCommand("sheet-mail", import.meta.url, parseCommand, execute);
