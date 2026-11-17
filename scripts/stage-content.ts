// pnpm stage-content: stages a content file for the server and adds its record to src/content/
// (parish-create-event, parish-create-service-sheet and parish-create-petrklic skills, and their
// parish-correct-* skills with --corrected). Every command checks the name is still free on the site (files on the
// server are never overwritten), copies the file under its ASCII name, renders the images and adds the record, then
// formats the files and runs their tests. --check only validates and prints, without copying or rendering: use it
// before the user confirms, so nothing unconfirmed is left staged for the next release.
// A failure restores src/content/ and removes the files it staged.
// With STAGE_RESULT set to a file (the CI service sheet run sets it), each `sheet draft` and `sheet --record` run
// writes what it did with its week there, the last run winning: drafted, staged, refused, or a document error when the
// parish's DOCX cannot be read, with the refusal's first line (`pnpm content-pr` takes the week's outcome from it).
//
// Usage: pnpm stage-content <command> ... [--check]
//   event <source> <label> [<source> <label> …] [--no-poster] --record <record.json>
//   event <source> <label> [<source> <label> …] --corrected (--record <record.json> | --id <id>)
//       aktuality/<id>-<label in ASCII>.<ext> for each file, in that order, plus <first file's name>-poster.webp
//       (page 1 / scaled image) when the first file is an image or PDF unless --no-poster, and adds the confirmed
//       NewsEvent (--record: the event as JSON, without its files; <id> is its id) with them to src/content/news/.
//       A new event needs its record, also with --check, which checks the files, their names and the record. A
//       pinned record takes the pin from the record pinned before (named in the output). --corrected stages
//       corrected or added files of an event already there and replaces its record (the --record, else with --id
//       the one on the site) with the files in it: each in the next -r<rev> once its file is on the server, else
//       under its name; the poster follows its file.
//   sheet <pdf|docx> --record <record.json> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected]
//       reads the week from the heading ("od 4. 10. 2026 do 11. 10. 2026"), stages
//       porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf and adds the confirmed sheet (--record:
//       days and announcements as JSON) to src/content/service-sheets.json, removing the outdated sheets and the covered
//       changes in src/content/schedule-exceptions.json (with --check it only validates). --corrected stages a
//       corrected PDF of a week already there, in the next -r<rev> once the week is on the server, else under its
//       name. Every run refuses a week before the current sheet or overlapping another. The parish's DOCX of the
//       whole year gives its newest week (--from and --to pick another): the PDF staged is that week's page of the
//       document converted with Word (Windows) or LibreOffice.
//   sheet draft <pdf|docx> --out <record.json> [--from YYYY-MM-DD --to YYYY-MM-DD] [--corrected]
//       writes the week's draft record, to fix or fill before `sheet --record`: a DOCX week's read from its table and
//       announcements, a PDF week's with every day of the week and no services or announcements yet. Checks the week
//       as `sheet` does, says when its sheet is already there (--record replaces it) and prints the events its
//       announcements can link as newsId; stages nothing (so it takes no --check).
//   petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--corrected]
//       checks the issue, stages petrklic/<id>/petrklic-<id>.pdf with cover.webp and pages/ and adds the
//       issue to src/content/petrklic.json (with --check it only validates). --corrected stages a corrected PDF of an
//       issue already there and replaces its record: in the next petrklic/<id>-r<rev>/ once the issue is on
//       the server, else in its folder.
//   petrklic --from <id> --year <year> --number <number> [--note "<note>"]
//       an issue whose year, number or note was wrong: stages its own PDF (staged, or downloaded from the site)
//       under the new id and moves its record there. A released old folder stays online, an unreleased one is
//       removed, and it names the lines of public/.htaccess that still redirect to the old PDF.
// A source without a folder is also looked for in ~/Downloads/.
// Requires pdftoppm, pdfinfo, pdftotext, pdfseparate and pdfunite (poppler-utils) for PDFs, and LibreOffice (or Word on
// Windows) for a DOCX.
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute } from "./lib/stage/command";

runCommand("stage-content", import.meta.url, (args) => args, withContentRestore(execute));
