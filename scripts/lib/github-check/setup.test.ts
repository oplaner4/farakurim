import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../content-files";
import { ENVIRONMENTS, REPOSITORY_SETTINGS, type Setting } from "./setup";

const WORKFLOWS = join(ROOT, ".github/workflows");
const workflows = readdirSync(WORKFLOWS)
  .filter((file) => file.endsWith(".yml"))
  .map((file) => readFileSync(join(WORKFLOWS, file), "utf8"));

/** Every `vars.X` and `secrets.X` the workflows read, but GitHub's own token. */
const used = new Set(
  workflows.flatMap((text) => [...text.matchAll(/\b(vars|secrets)\.([A-Z0-9_]+)/g)].map((m) => `${m[1]}.${m[2]}`)),
);
used.delete("secrets.GITHUB_TOKEN");

/** Every environment a job runs in, `environment: x` or `environment:` with `name: x`. */
const environments = new Set(
  workflows.flatMap((text) =>
    [...text.matchAll(/^\s+environment:[ \t]*(?:([\w-]+)|\n\s+name:[ \t]*([\w-]+))/gm)].map((m) => m[1] ?? m[2]),
  ),
);

const settings: Setting[] = [...REPOSITORY_SETTINGS, ...ENVIRONMENTS.flatMap((env) => env.settings)];
const reads = (setting: Setting) =>
  setting.kind === "either"
    ? [`vars.${setting.name}`, `secrets.${setting.name}`]
    : [`${setting.kind === "variable" ? "vars" : "secrets"}.${setting.name}`];

describe("the GitHub setup", () => {
  it("names every variable and secret a workflow reads, of the kind it is read as", () => {
    const named = new Set(settings.flatMap(reads));
    expect([...used].filter((name) => !named.has(name))).toEqual([]);
  });

  it("names nothing no workflow reads", () => {
    expect(settings.filter((setting) => !reads(setting).every((read) => used.has(read)))).toEqual([]);
  });

  it("names exactly the environments the workflows run in", () => {
    expect(ENVIRONMENTS.map((env) => env.name).sort()).toEqual([...environments].sort());
  });
});
