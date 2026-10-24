// pnpm stage: stages a content file for the server and adds its record to src/content/
// (parish-create-event, parish-create-service-sheet and parish-create-petrklic skills, and their
// parish-correct-* skills with --corrected). Every command checks the name is still free on the site (files on the
// server are never overwritten), copies the file under its ASCII name, renders the images and adds the record, then
// formats the files and runs their tests. --check only validates and prints, without copying or rendering: use it
// before the user confirms, so nothing unconfirmed is left staged for the next release.
//
// Usage: pnpm stage <command> ... [--check]
//   event <id> <source> <label> [<source> <label> …] [--no-poster] [--corrected] [--record <record.json>]
//       aktuality/<id>-<label in ASCII>.<ext> for each file, in that order, plus <first file's name>-poster.webp
//       (page 1 / scaled image) when the first file is an image or PDF unless --no-poster, and adds the confirmed
//       NewsEvent (--record: the event as JSON, without its files) with them to src/content/news/. --record is
//       required, except with --check, which then only checks the files and their names (with a record, --check
//       also validates it). A pinned record takes the pin from the record pinned before (named in the output).
//       --corrected stages corrected or added files of an event already there and replaces its record (the
//       --record, else the one on the site) with the files in it: each in the next -r<rev> once its file is on the
//       server, else under its name; the poster follows its file.
//   sheet <pdf|docx> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected] [--record <record.json> | --draft <file>]
//       reads the week from the heading ("od 4. 10. 2026 do 11. 10. 2026"), stages
//       porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf and adds the confirmed sheet (--record:
//       days and announcements as JSON) to src/content/service-sheets.json, removing the outdated sheets and the covered
//       changes in src/content/schedule-exceptions.json. --record is required, except with --check, which then prints
//       the week, its days and the events its announcements can link as newsId (with a record, --check only
//       validates it). --corrected stages a corrected PDF of a
//       week already there, in the next -r<rev> once the week is on the server, else under its name. Every run refuses
//       a week before the current sheet or overlapping another, and --check without a record says when the week's sheet
//       is already there (--record replaces it).
//       Without a source, --record replaces the record of the sheet --from and --to name (a correction of the record
//       alone): the sheet keeps its PDF and rev, and nothing is staged.
//       The parish's DOCX of the whole year gives its newest week (--from and --to pick another): the PDF staged is
//       that week's page of the document converted with Word (Windows) or LibreOffice, and --draft <file> writes the
//       week's draft record, read from its table and announcements, to check before --record (stages nothing; it
//       prints what --check does).
//   petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--corrected]
//       checks the issue, stages petrklic/<id>/petrklic-<id>.pdf with cover.webp and pages/ and adds the
//       issue to src/content/petrklic.json (with --check it only validates). --corrected stages a corrected PDF of an
//       issue already there and replaces its record: in the next petrklic/<id>-r<rev>/ once the issue is on
//       the server, else in its folder.
// A source without a folder is also looked for in ~/Downloads/.
// Requires pdftoppm, pdfinfo, pdftotext, pdfseparate and pdfunite (poppler-utils) for PDFs, and LibreOffice (or Word on
// Windows) for a DOCX.
import { runCommand } from "./lib/command";
import { execute } from "./lib/stage/command";

runCommand("stage", import.meta.url, (args) => args, execute);
