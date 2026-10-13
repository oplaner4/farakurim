// pnpm event-poster: sets or removes the poster of an event already in src/content/news/
// (parish-correct-event skill), then formats the month file and runs the news tests. The poster is made from
// the attachment with the label: rendered from its file in uploads/ (`pnpm pull-uploads` fetches a released one), or
// only linked when its WebP is on the server already.
//
// Usage: pnpm event-poster <id> "<label>" | --none [--check]
// --none removes the poster (its WebP stays on the server, unlinked). --check only validates and prints what would
// change, without rendering or writing.
// Requires pdftoppm (poppler-utils) for a PDF attachment.
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/news/event-poster";

runCommand("event-poster", import.meta.url, parseCommand, execute);
