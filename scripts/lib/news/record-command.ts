// A command on one event record file: it reads the file (`-` for stdin) and --check, runs on the record, prints its
// lines, and then, unless it only checked, formats and tests the news files it wrote.

import { parseRecordCommand, readJsonRecord } from "../command";
import { formatAndTestNews } from "../content-files";

/** What a run on the record gives: the lines to print and the news files it wrote. */
type RecordRun = { lines: string[]; written: string[] };

/** The command's `parseCommand` (with `usage`) and `execute`, which runs `run` on the record in the file. */
export function recordCommand(usage: string, run: (input: unknown, check: boolean) => RecordRun) {
  return {
    /** Reads the command line `args`: the record file (`-` for stdin) and --check. */
    parseCommand: (args: string[]) => parseRecordCommand(args, usage),
    execute: async ({ file, check }: { file: string; check: boolean }) => {
      const { lines, written } = run(readJsonRecord(file), check);
      console.log(lines.join("\n"));
      if (!check) await formatAndTestNews(written);
    },
  };
}
