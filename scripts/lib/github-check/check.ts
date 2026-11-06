// Compares a repository's GitHub setup with the one the workflows need: an error breaks a workflow or a guarantee
// the docs give, a warning is a leftover or something the token could not see.

import type { EnvironmentState, RepositoryState, RulesetState } from "./read";
import {
  ADMIN_ROLE_ID,
  ENVIRONMENTS,
  FORBIDDEN,
  REPOSITORY_SETTINGS,
  REQUIRED_CHECK,
  type DeployRef,
  type EnvironmentSpec,
  type Setting,
} from "./setup";

export type Finding = { level: "error" | "warning"; message: string };

const error = (message: string): Finding => ({ level: "error", message });
const warning = (message: string): Finding => ({ level: "warning", message });

/** Whether a deployment policy's name pattern (GitHub's fnmatch: `*` stops at `/`, `**` does not) matches `ref`. */
export function matchesPolicy(pattern: string, ref: string): boolean {
  const source = pattern
    .split(/(\*\*|\*|\?)/)
    .map((part) =>
      part === "**" ? ".*" : part === "*" ? "[^/]*" : part === "?" ? "[^/]" : part.replace(/[.+^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");
  return new RegExp(`^${source}$`).test(ref);
}

type Holder = { variables: string[]; secrets: string[] };

const holds = (holder: Holder, setting: Setting) =>
  (setting.kind !== "secret" && holder.variables.includes(setting.name)) ||
  (setting.kind !== "variable" && holder.secrets.includes(setting.name));

const kindLabel = (setting: Setting) => (setting.kind === "either" ? "secret or variable" : setting.kind);

function checkRepositorySettings(state: RepositoryState): Finding[] {
  const findings: Finding[] = [];
  for (const setting of REPOSITORY_SETTINGS) {
    if (holds(state, setting)) continue;
    const inEnvironments = state.environments.filter((env) => holds(env, setting)).map((env) => env.name);
    if (inEnvironments.length) {
      findings.push(
        error(
          `${kindLabel(setting)} ${setting.name} is set in ${inEnvironments.join(", ")}, not in the repository: ` +
            "every workflow reads it from the repository",
        ),
      );
    } else if (setting.optional) {
      findings.push(warning(`repository: no ${kindLabel(setting)} ${setting.name} (optional)`));
    } else {
      findings.push(error(`repository: no ${kindLabel(setting)} ${setting.name}`));
    }
  }
  const environmentOnly = ENVIRONMENTS.flatMap((env) => env.settings).filter((setting) => setting.environmentOnly);
  for (const [i, setting] of environmentOnly.entries()) {
    if (environmentOnly.findIndex((other) => other.name === setting.name) !== i) continue;
    if (holds(state, setting)) {
      findings.push(
        error(
          `repository: ${kindLabel(setting)} ${setting.name} must be set in each environment only: ` +
            "a repository-wide one stands in for a missing environment's",
        ),
      );
    }
  }
  return findings;
}

function checkDeployFrom(spec: EnvironmentSpec, env: EnvironmentState): Finding[] {
  const where = `environment ${spec.name}`;
  if (env.deployFrom === "all") return [];
  const describe = (ref: DeployRef) => `${ref.type} ${ref.type === "tag" ? "v*" : ref.sample}`;
  if (env.deployFrom === "protected") {
    return spec.deployFrom.map((ref) =>
      ref.type === "tag"
        ? error(`${where}: deploys from protected branches only, so the ${describe(ref)} cannot deploy`)
        : warning(`${where}: deploys from protected branches only: make sure ${ref.sample} is protected`),
    );
  }
  const policies = env.deployFrom;
  return spec.deployFrom
    .filter((ref) => !policies.some((policy) => policy.type === ref.type && matchesPolicy(policy.name, ref.sample)))
    .map((ref) => error(`${where}: its deployment branches and tags do not allow the ${describe(ref)}`));
}

function checkEnvironment(spec: EnvironmentSpec, env: EnvironmentState | undefined, repo: Holder): Finding[] {
  const where = `environment ${spec.name}`;
  if (!env) return [error(`no ${where}`)];
  const findings = checkDeployFrom(spec, env);
  if (spec.noReviewers && env.requiredReviewers) {
    findings.push(error(`${where}: has required reviewers, which hold its scheduled runs`));
  }
  for (const setting of spec.settings) {
    if (holds(env, setting)) continue;
    // A repository-wide value reaches the environment's jobs too, except where each environment must hold its own.
    if (!setting.environmentOnly && holds(repo, setting)) continue;
    findings.push(error(`${where}: no ${kindLabel(setting)} ${setting.name}`));
  }
  return findings;
}

/** Every name set somewhere that no workflow reads (a typo, or a leftover of an old setup). */
function checkUnknownNames(state: RepositoryState): Finding[] {
  const findings: Finding[] = [];
  // A repository-wide value of an environment's setting reaches that environment's jobs, so it is known too.
  const anyNames = new Set([...REPOSITORY_SETTINGS, ...ENVIRONMENTS.flatMap((env) => env.settings)].map((s) => s.name));
  const report = (where: string, kind: string, list: string[], known: Set<string>) => {
    for (const name of list) {
      if (FORBIDDEN.includes(name)) {
        findings.push(
          error(`${where}: ${kind} ${name} must not exist: it wins over the Claude federation, even empty`),
        );
      } else if (!known.has(name)) findings.push(warning(`${where}: ${kind} ${name} is not in the documented setup`));
    }
  };
  report("repository", "variable", state.variables, anyNames);
  report("repository", "secret", state.secrets, anyNames);
  for (const env of state.environments) {
    const spec = ENVIRONMENTS.find((candidate) => candidate.name === env.name);
    if (!spec) {
      findings.push(warning(`environment ${env.name} is used by no workflow`));
      continue;
    }
    const known = new Set(spec.settings.map((setting) => setting.name));
    report(`environment ${env.name}`, "variable", env.variables, known);
    report(`environment ${env.name}`, "secret", env.secrets, known);
  }
  return findings;
}

const onMain = (ruleset: RulesetState) =>
  ruleset.target === "branch" &&
  ruleset.include.some((ref) => ["~DEFAULT_BRANCH", "~ALL", "refs/heads/main"].includes(ref));

function checkRulesets(rulesets: RulesetState[]): Finding[] {
  const requiring = rulesets.filter(
    (ruleset) =>
      ruleset.enforcement === "active" &&
      onMain(ruleset) &&
      ruleset.rules.some((rule) => rule.type === "required_status_checks" && rule.checks.includes(REQUIRED_CHECK)),
  );
  if (!requiring.length) {
    // A "Require status checks to pass" rule with no check added requires nothing.
    const without = rulesets.find(
      (ruleset) =>
        ruleset.enforcement === "active" &&
        onMain(ruleset) &&
        ruleset.rules.some((rule) => rule.type === "required_status_checks"),
    );
    const hint = without
      ? ` (ruleset "${without.name}" requires status checks, but not "${REQUIRED_CHECK}": add it from GitHub Actions)`
      : "";
    return [
      error(
        `no active ruleset on main requires the status check "${REQUIRED_CHECK}": a red content PR can be merged${hint}`,
      ),
    ];
  }
  return requiring.flatMap((ruleset) => {
    const where = `ruleset "${ruleset.name}"`;
    const findings: Finding[] = [];
    if (!ruleset.bypass) {
      findings.push(warning(`${where}: the token may not see its bypass actors (needs an admin's token)`));
    } else {
      if (!ruleset.bypass.some((actor) => actor.type === "Integration")) {
        findings.push(error(`${where}: the content GitHub App is no bypass actor, so the content release cannot push`));
      }
      if (!ruleset.bypass.some((actor) => actor.type === "RepositoryRole" && actor.id === ADMIN_ROLE_ID)) {
        findings.push(error(`${where}: the repository admin role is no bypass actor, so pnpm release cannot push`));
      }
    }
    const others = ruleset.rules.filter((rule) => rule.type !== "required_status_checks").map((rule) => rule.type);
    if (others.length) {
      findings.push(
        warning(
          `${where}: also holds ${others.join(", ")}, which its bypass actors skip: move them to a ruleset of their own`,
        ),
      );
    }
    return findings;
  });
}

/** Every finding about `state`, errors first. */
/** Write access is what a review can be requested of (GitHub reports maintain as write). */
const CAN_REVIEW = ["admin", "write"];

/** Each variable whose value is not of its format, wherever it is set, and each reviewer who cannot be asked. */
function checkValues(state: RepositoryState): Finding[] {
  const findings: Finding[] = [];
  const test = (
    where: string,
    holder: { variables: string[]; values: Record<string, string> },
    settings: Setting[],
  ) => {
    const tested = new Set<string>();
    for (const setting of settings) {
      if (!setting.format || tested.has(setting.name) || !holder.variables.includes(setting.name)) continue;
      tested.add(setting.name);
      if (!setting.format.schema.safeParse(holder.values[setting.name]).success) {
        findings.push(error(`${where}: variable ${setting.name} is not ${setting.format.expected}`));
      }
    }
  };
  // A repository-wide value of an environment's setting reaches that environment's jobs, so it is tested too.
  test("repository", state, [...REPOSITORY_SETTINGS, ...ENVIRONMENTS.flatMap((env) => env.settings)]);
  for (const env of state.environments) {
    const spec = ENVIRONMENTS.find((candidate) => candidate.name === env.name);
    if (spec) test(`environment ${env.name}`, env, spec.settings);
  }
  for (const [login, permission] of Object.entries(state.reviewerAccess)) {
    if (permission === null) {
      findings.push(error(`repository: CONTENT_REVIEWERS names ${login}, a login GitHub does not know`));
    } else if (!CAN_REVIEW.includes(permission)) {
      findings.push(
        error(
          `repository: CONTENT_REVIEWERS names ${login}, who has ${permission} access: a review needs write access`,
        ),
      );
    }
  }
  return findings;
}

export function checkRepository(state: RepositoryState): Finding[] {
  const findings: Finding[] = [];
  if (state.squashMerge === null)
    findings.push(warning("repository: the token may not see whether squash merging is allowed"));
  else if (!state.squashMerge)
    findings.push(
      error("repository: squash merging is not allowed, and the content release counts only squash commits"),
    );
  findings.push(...checkRepositorySettings(state), ...checkValues(state));
  for (const spec of ENVIRONMENTS) {
    findings.push(
      ...checkEnvironment(
        spec,
        state.environments.find((env) => env.name === spec.name),
        state,
      ),
    );
  }
  findings.push(...checkUnknownNames(state), ...checkRulesets(state.rulesets));
  return [...findings.filter((f) => f.level === "error"), ...findings.filter((f) => f.level === "warning")];
}
