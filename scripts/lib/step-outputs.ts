// A GitHub Actions step's outputs, written by a script to the file the runner names in GITHUB_OUTPUT: each value in
// the `name<<delimiter` form, so a value holding a newline cannot end it early or add an output of its own.

import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

/** A step's outputs: the name a workflow reads (`steps.<id>.outputs.<name>`) and its value, "" for none. */
export type StepOutputs = Record<string, string>;

/** The lines of `outputs` in the multiline form, each value between a line with its name and the delimiter. */
export function stepOutputLines(outputs: StepOutputs, delimiter = `ghadelimiter_${randomUUID()}`): string {
  return Object.entries(outputs)
    .map(([name, value]) => {
      if (!/^[A-Za-z_][\w-]*$/.test(name)) throw new Error(`"${name}" is not a step output name`);
      if (value.split("\n").includes(delimiter)) throw new Error(`The output ${name} holds the delimiter`);
      return `${name}<<${delimiter}\n${value}\n${delimiter}\n`;
    })
    .join("");
}

/** Appends `outputs` to the step's output file (the GITHUB_OUTPUT the workflow passes in). */
export function appendStepOutputs(file: string, outputs: StepOutputs): void {
  appendFileSync(file, stepOutputLines(outputs));
}
