// The tagged lines of the scripts' output: a line meant for whoever runs the script starts with one tag, so a reader
// acts on the tag instead of on the sentence.
//   tell:   a note for the user, passed on as printed
//   ask:    a question only a person can answer (the user's document, the calendar)
//   next:   the step that resolves a refusal or a note
//   state:  the record's state before the run, one word (State)
// A result line ("Added …", "Changed: …") carries no tag.

/** The states a `state:` line names: in the content but not released, released, already the pinned event. */
export type State = "staged" | "published" | "pinned";

export const tell = (text: string) => `tell: ${text}`;
export const ask = (question: string) => `ask: ${question}`;
export const next = (step: string) => `next: ${step}`;
export const state = (value: State) => `state: ${value}`;

/** A refusal: its reason on the first line, then its tagged lines, one per line. */
export const refusal = (reason: string, ...lines: string[]) => new Error([reason, ...lines].join("\n"));

/** The reason of a refusal's `message`: its first line. */
export const refusalReason = (message: string) => message.split("\n")[0];
