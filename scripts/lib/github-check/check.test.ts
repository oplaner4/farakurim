import { describe, expect, it } from "vitest";
import { checkRepository, matchesPolicy } from "./check";
import type { EnvironmentState, RepositoryState, RulesetState } from "./read";
import { ENVIRONMENTS, REPOSITORY_SETTINGS } from "./setup";

const names = (kind: "variable" | "secret", list = REPOSITORY_SETTINGS) =>
  list
    .filter((setting) => setting.kind === kind || (setting.kind === "either" && kind === "secret"))
    .map((s) => s.name);

const checkRuleset: RulesetState = {
  name: "check",
  target: "branch",
  enforcement: "active",
  include: ["~DEFAULT_BRANCH"],
  rules: [{ type: "required_status_checks", checks: ["check"] }],
  bypass: [
    { type: "Integration", id: 123 },
    { type: "RepositoryRole", id: 5 },
  ],
};

/** The setup the docs describe, every setting in its place. */
function complete(): RepositoryState {
  return {
    squashMerge: true,
    variables: names("variable"),
    secrets: names("secret"),
    environments: ENVIRONMENTS.map((spec): EnvironmentState => ({
      name: spec.name,
      requiredReviewers: false,
      deployFrom: [
        { type: "branch", name: "main" },
        { type: "tag", name: "v*" },
      ],
      variables: names("variable", spec.settings),
      secrets: names("secret", spec.settings),
    })),
    rulesets: [checkRuleset],
  };
}

const env = (state: RepositoryState, name: string) => state.environments.find((e) => e.name === name)!;
const messages = (state: RepositoryState) => checkRepository(state).map((f) => `${f.level}: ${f.message}`);

describe("checkRepository", () => {
  it("finds nothing in the documented setup", () => {
    expect(messages(complete())).toEqual([]);
  });

  it("names a missing repository setting, and one set in an environment instead", () => {
    const state = complete();
    state.variables = state.variables.filter((name) => name !== "MATOMO_URL" && name !== "CONTENT_REVIEWERS");
    env(state, "events-publish").variables.push("CONTENT_REVIEWERS");
    expect(messages(state)).toEqual([
      "error: repository: no variable MATOMO_URL",
      "error: variable CONTENT_REVIEWERS is set in events-publish, not in the repository: every workflow reads it from the repository",
      "warning: environment events-publish: variable CONTENT_REVIEWERS is not in the documented setup",
    ]);
  });

  it("only warns of a missing optional setting", () => {
    const state = complete();
    state.variables = state.variables.filter((name) => name !== "CONTENT_REVIEWERS");
    expect(messages(state)).toEqual(["warning: repository: no variable CONTENT_REVIEWERS (optional)"]);
  });

  it("accepts an environment's setting from the repository, but not a federation rule", () => {
    const state = complete();
    const production = env(state, "Production");
    production.secrets = production.secrets.filter((name) => name !== "DEPLOY_SSH_KEY");
    state.secrets.push("DEPLOY_SSH_KEY");
    const fix = env(state, "content-fix");
    fix.variables = [];
    state.variables.push("ANTHROPIC_FEDERATION_RULE_ID");
    expect(messages(state)).toEqual([
      "error: repository: variable ANTHROPIC_FEDERATION_RULE_ID must be set in each environment only: a repository-wide one stands in for a missing environment's",
      "error: environment content-fix: no variable ANTHROPIC_FEDERATION_RULE_ID",
    ]);
  });

  it("takes the known hosts as a secret or a variable", () => {
    const state = complete();
    const production = env(state, "Production");
    production.secrets = production.secrets.filter((name) => name !== "DEPLOY_KNOWN_HOSTS");
    production.variables.push("DEPLOY_KNOWN_HOSTS");
    expect(messages(state)).toEqual([]);
    production.variables = [];
    expect(messages(state)).toEqual(["error: environment Production: no secret or variable DEPLOY_KNOWN_HOSTS"]);
  });

  it("checks each environment's deployment refs and reviewers", () => {
    const state = complete();
    state.environments = state.environments.filter((e) => e.name !== "content-fix");
    env(state, "Production").deployFrom = [{ type: "tag", name: "v*" }];
    env(state, "calendar-sync").deployFrom = "protected";
    env(state, "events-publish").deployFrom = "all";
    env(state, "service-sheet-publish").requiredReviewers = true;
    expect(messages(state)).toEqual([
      "error: environment Production: its deployment branches and tags do not allow the branch main",
      "error: environment calendar-sync: deploys from protected branches only, so the tag v* cannot deploy",
      "error: environment service-sheet-publish: has required reviewers, which hold its scheduled runs",
      "error: no environment content-fix",
      "warning: environment calendar-sync: deploys from protected branches only: make sure main is protected",
    ]);
  });

  it("refuses ANTHROPIC_API_KEY anywhere and warns of unknown names and environments", () => {
    const state = complete();
    state.secrets.push("ANTHROPIC_API_KEY", "OLD_TOKEN");
    env(state, "events-publish").variables.push("ANTHROPIC_API_KEY");
    state.environments.push({
      name: "github-pages",
      requiredReviewers: false,
      deployFrom: "all",
      variables: [],
      secrets: [],
    });
    expect(messages(state)).toEqual([
      "error: repository: secret ANTHROPIC_API_KEY must not exist: it wins over the Claude federation, even empty",
      "error: environment events-publish: variable ANTHROPIC_API_KEY must not exist: it wins over the Claude federation, even empty",
      "warning: repository: secret OLD_TOKEN is not in the documented setup",
      "warning: environment github-pages is used by no workflow",
    ]);
  });

  it("needs squash merging and the check ruleset with its bypass actors", () => {
    const state = complete();
    state.squashMerge = false;
    state.rulesets = [
      { ...checkRuleset, bypass: [], rules: [...checkRuleset.rules, { type: "non_fast_forward", checks: [] }] },
    ];
    expect(messages(state)).toEqual([
      "error: repository: squash merging is not allowed, and the content release counts only squash commits",
      'error: ruleset "check": the content GitHub App is no bypass actor, so the content release cannot push',
      'error: ruleset "check": the repository admin role is no bypass actor, so pnpm release cannot push',
      'warning: ruleset "check": also holds non_fast_forward, which its bypass actors skip: move them to a ruleset of their own',
    ]);
    state.rulesets = [{ ...checkRuleset, enforcement: "evaluate" }];
    expect(messages(state).slice(1)).toEqual([
      'error: no active ruleset on main requires the status check "check": a red content PR can be merged',
    ]);
    // The rule switched on with no check added, as GitHub saves it.
    state.rulesets = [{ ...checkRuleset, rules: [{ type: "required_status_checks", checks: [] }] }];
    expect(messages(state).slice(1)).toEqual([
      'error: no active ruleset on main requires the status check "check": a red content PR can be merged (ruleset "check" requires status checks, but not "check": add it from GitHub Actions)',
    ]);
  });

  it("warns of what the token cannot see", () => {
    const state = complete();
    state.squashMerge = null;
    state.rulesets = [{ ...checkRuleset, bypass: null }];
    expect(messages(state)).toEqual([
      "warning: repository: the token may not see whether squash merging is allowed",
      'warning: ruleset "check": the token may not see its bypass actors (needs an admin\'s token)',
    ]);
  });
});

describe("matchesPolicy", () => {
  it("matches GitHub's name patterns", () => {
    expect(matchesPolicy("v*", "v1.2.3")).toBe(true);
    expect(matchesPolicy("main", "main")).toBe(true);
    expect(matchesPolicy("*", "main")).toBe(true);
    expect(matchesPolicy("*", "release/x")).toBe(false);
    expect(matchesPolicy("**", "release/x")).toBe(true);
    expect(matchesPolicy("v?.*", "v1.2.3")).toBe(true);
    expect(matchesPolicy("mai", "main")).toBe(false);
    expect(matchesPolicy("v.1", "vx1")).toBe(false);
  });
});
