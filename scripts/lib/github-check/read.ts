// Reads a repository's GitHub setup from the REST API: the merge settings, the variables and secrets (names only),
// the environments with their deployment policies, and the rulesets. Read-only; listing secrets and the rulesets'
// bypass actors needs an admin's token.

import { gitHubGet } from "../github";

export type EnvironmentState = {
  name: string;
  requiredReviewers: boolean;
  /** `all`: any branch or tag may deploy; `protected`: protected branches only; else the custom policies. */
  deployFrom: "all" | "protected" | { type: "branch" | "tag"; name: string }[];
  variables: string[];
  secrets: string[];
};

export type RulesetState = {
  name: string;
  target: string;
  enforcement: string;
  include: string[];
  rules: { type: string; checks: string[] }[];
  /** null when the token may not see them. */
  bypass: { type: string; id: number | null }[] | null;
};

export type RepositoryState = {
  /** null when the token may not see it. */
  squashMerge: boolean | null;
  variables: string[];
  secrets: string[];
  environments: EnvironmentState[];
  rulesets: RulesetState[];
};

type Get = <T>(path: string) => Promise<T>;

/** Every name of a paged list (`key` of each page) under `path`; the variables come 30 a page at most. */
async function names(get: Get, path: string, key: string, perPage: number): Promise<string[]> {
  const found: string[] = [];
  for (let page = 1; ; page++) {
    const answer = await get<{ total_count: number } & Record<string, { name: string }[]>>(
      `${path}?per_page=${perPage}&page=${page}`,
    );
    const items = answer[key];
    found.push(...items.map((item) => item.name));
    if (!items.length || found.length >= answer.total_count) return found;
  }
}

type ApiEnvironment = {
  name: string;
  protection_rules?: { type: string }[];
  deployment_branch_policy: { protected_branches: boolean; custom_branch_policies: boolean } | null;
};
type ApiRule = { type: string; parameters?: { required_status_checks?: { context: string }[] } };
type ApiRuleset = {
  name: string;
  target: string;
  enforcement: string;
  conditions?: { ref_name?: { include?: string[] } };
  rules?: ApiRule[];
  bypass_actors?: { actor_type: string; actor_id: number | null }[];
};

async function environment(get: Get, env: ApiEnvironment): Promise<EnvironmentState> {
  const path = `/environments/${encodeURIComponent(env.name)}`;
  const policy = env.deployment_branch_policy;
  let deployFrom: EnvironmentState["deployFrom"] = "all";
  if (policy?.protected_branches) deployFrom = "protected";
  else if (policy?.custom_branch_policies) {
    const answer = await get<{ branch_policies: { name: string; type?: "branch" | "tag" }[] }>(
      `${path}/deployment-branch-policies?per_page=100`,
    );
    deployFrom = answer.branch_policies.map(({ name, type }) => ({ type: type ?? "branch", name }));
  }
  return {
    name: env.name,
    requiredReviewers: (env.protection_rules ?? []).some((rule) => rule.type === "required_reviewers"),
    deployFrom,
    variables: await names(get, `${path}/variables`, "variables", 30),
    secrets: await names(get, `${path}/secrets`, "secrets", 100),
  };
}

function ruleset(answer: ApiRuleset): RulesetState {
  return {
    name: answer.name,
    target: answer.target,
    enforcement: answer.enforcement,
    include: answer.conditions?.ref_name?.include ?? [],
    rules: (answer.rules ?? []).map((rule) => ({
      type: rule.type,
      checks: (rule.parameters?.required_status_checks ?? []).map((check) => check.context),
    })),
    bypass: answer.bypass_actors?.map((actor) => ({ type: actor.actor_type, id: actor.actor_id })) ?? null,
  };
}

/** The setup of `repo` ("owner/name"), read with `token`. */
export async function readRepository(repo: string, token: string, fetchImpl: typeof fetch = fetch) {
  const get: Get = gitHubGet(repo, token, fetchImpl);
  const repository = await get<{ allow_squash_merge?: boolean }>("");
  const envs = await get<{ environments: ApiEnvironment[] }>("/environments?per_page=100");
  const rulesets = await get<{ id: number }[]>("/rulesets?per_page=100");
  return {
    squashMerge: repository.allow_squash_merge ?? null,
    variables: await names(get, "/actions/variables", "variables", 30),
    secrets: await names(get, "/actions/secrets", "secrets", 100),
    environments: await Promise.all(envs.environments.map((env) => environment(get, env))),
    rulesets: await Promise.all(rulesets.map(async ({ id }) => ruleset(await get<ApiRuleset>(`/rulesets/${id}`)))),
  } satisfies RepositoryState;
}
