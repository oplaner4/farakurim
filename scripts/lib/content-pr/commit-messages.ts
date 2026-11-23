// Checks the commit messages of a content PR with commitlint's API and the repo's config (commitlint.config.mjs):
// each refused message gets its reasons, so a warning or the agent's check can say what to change.

import { ROOT } from "../content-files";

/** Why a message is refused, each `<rule>: <message>`; none when it is accepted. */
export type MessageCheck = (message: string) => Promise<string[]>;

/** The start of every fix message: a comment fix corrects the PR's content. */
export const FIX_PREFIX = "fix(content): ";

type Loaded = Awaited<ReturnType<typeof import("@commitlint/load").default>>;
/** The parser options `lint` takes: the loaded config types its parser preset's options as unknown. */
type ParserOptions = NonNullable<Parameters<typeof import("@commitlint/lint").default>[2]>["parserOpts"];
let loaded: Promise<Loaded> | undefined;

/**
 * Loads the repo's config once. The packages are ESM only and the scripts run as CommonJS under tsx, where a static
 * import would `require` them, so they are imported dynamically.
 */
function config(): Promise<Loaded> {
  loaded ??= import("@commitlint/load").then(({ default: load }) => load({}, { cwd: ROOT }));
  return loaded;
}

/**
 * Why commitlint refuses `message` with the repo's config. Stricter than the hook in two ways, as a bot's message is
 * never a merge or a revert git wrote: an empty message is refused (the API, unlike the CLI, accepts it), and so is
 * one that commitlint's default ignores would skip (`Merge branch …`, `Revert …`).
 */
export const commitlintIssues: MessageCheck = async (message) => {
  if (!message.trim()) return ["the message is empty"];
  const [{ rules, parserPreset, plugins }, { default: lint }] = await Promise.all([
    config(),
    import("@commitlint/lint"),
  ]);
  const parserOpts = parserPreset?.parserOpts as ParserOptions;
  const report = await lint(message, rules, { parserOpts, plugins, defaultIgnores: false });
  return report.errors.map((error) => `${error.name}: ${error.message}`);
};

/**
 * Why the agent's fix message is refused: it must be one line starting with `fix(content): ` (a fix corrects the PR's
 * content; the fix commit's subject is all the PR's commit list shows) that `lint` accepts.
 */
export async function fixMessageIssues(message: string, lint: MessageCheck = commitlintIssues): Promise<string[]> {
  const issues = [
    ...(message.startsWith(FIX_PREFIX) ? [] : [`must start with "${FIX_PREFIX}"`]),
    ...(message.includes("\n") ? ["must be one line"] : []),
  ];
  return [...issues, ...(await lint(message))];
}
