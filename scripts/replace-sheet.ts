// pnpm replace-sheet: corrects the record of a service sheet already in src/content/service-sheets.json
// (parish-correct-service-sheet skill), then formats the file and runs the service sheet tests.
// A failure restores src/content/ and removes the files it staged.
//
// Usage: pnpm replace-sheet <record.json | -> --from YYYY-MM-DD --to YYYY-MM-DD [--check]
// The record holds the corrected sheet's days and announcements as JSON (`-` reads stdin), without validFrom, validTo
// and rev; --from and --to name the sheet, which keeps its PDF and rev, and nothing is staged. It prints what differs
// from the sheet (`Changed: …`): each day's changed fields and rows, and the announcements. --check only validates
// and prints, without writing. A corrected PDF or DOCX is staged with `pnpm stage-content sheet … --corrected` instead.
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute, parseCommand } from "./lib/services/replace-sheet";

runCommand("replace-sheet", import.meta.url, parseCommand, withContentRestore(execute));
