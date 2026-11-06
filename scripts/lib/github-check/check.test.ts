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

/** A value of the right format for every variable (made up, in the shape the real ones have). */
const VALID: Record<string, string> = {
  GOOGLE_CALENDAR_API_KEY: "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q",
  MATOMO_URL: "https://statistiky.farakurim.cz",
  MATOMO_SITE_ID: "1",
  CONTENT_APP_CLIENT_ID: "Iv23liAbCdEfGhIjKlMn",
  ANTHROPIC_ORGANIZATION_ID: "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b",
  ANTHROPIC_SERVICE_ACCOUNT_ID: "svac_01AbCdEf",
  ANTHROPIC_WORKSPACE_ID: "wrkspc_01AbCdEf",
  ANTHROPIC_FEDERATION_RULE_ID: "fdrl_01AbCdEf",
  CONTENT_REVIEWERS: "oplaner4",
  IMAP_HOST: "imap.example.cz",
  DEPLOY_KNOWN_HOSTS: "farakurim.cz ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
  GOOGLE_WORKLOAD_IDENTITY_PROVIDER:
    "projects/123456789012/locations/global/workloadIdentityPools/github/providers/github",
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL: "calendar-sync@farakurim-web.iam.gserviceaccount.com",
};

/** The setup the docs describe, every setting in its place. */
function complete(): RepositoryState {
  return {
    squashMerge: true,
    variables: names("variable"),
    values: { ...VALID },
    secrets: names("secret"),
    environments: ENVIRONMENTS.map((spec): EnvironmentState => ({
      name: spec.name,
      requiredReviewers: false,
      deployFrom: [
        { type: "branch", name: "main" },
        { type: "tag", name: "v*" },
      ],
      variables: names("variable", spec.settings),
      values: { ...VALID },
      secrets: names("secret", spec.settings),
    })),
    rulesets: [checkRuleset],
    reviewerAccess: { oplaner4: "admin" },
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
      values: {},
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

  it("names each variable whose value is not of its format, wherever it is set", () => {
    const state = complete();
    state.values.MATOMO_URL = "http://statistiky.farakurim.cz";
    state.values.CONTENT_APP_CLIENT_ID = "1234567";
    state.values.ANTHROPIC_ORGANIZATION_ID = "";
    env(state, "events-publish").values.IMAP_HOST = "imaps://imap.example.cz:993";
    env(state, "service-sheet-publish").values.ANTHROPIC_FEDERATION_RULE_ID = "fdrl_01AbCdEf\n";
    env(state, "calendar-sync").values.GOOGLE_WORKLOAD_IDENTITY_PROVIDER =
      "projects/farakurim-web/locations/global/workloadIdentityPools/github/providers/github";
    expect(messages(state)).toEqual([
      "error: repository: variable MATOMO_URL is not an https URL",
      "error: repository: variable CONTENT_APP_CLIENT_ID is not the App's Client ID (Iv23…), not its numeric App ID",
      "error: repository: variable ANTHROPIC_ORGANIZATION_ID is not the organization's UUID",
      "error: environment calendar-sync: variable GOOGLE_WORKLOAD_IDENTITY_PROVIDER is not projects/<project number>/locations/global/workloadIdentityPools/<pool>/providers/<provider> (the project number, not its ID)",
      "error: environment service-sheet-publish: variable ANTHROPIC_FEDERATION_RULE_ID is not an ID fdrl_…",
      "error: environment events-publish: variable IMAP_HOST is not a host name only (imap.example.cz), without a scheme, port or path",
    ]);
  });

  it("checks a value set in the repository for an environment, and the known hosts as a variable", () => {
    const state = complete();
    const production = env(state, "Production");
    production.secrets = production.secrets.filter((name) => name !== "DEPLOY_KNOWN_HOSTS");
    production.variables.push("DEPLOY_KNOWN_HOSTS");
    production.values.DEPLOY_KNOWN_HOSTS = "farakurim.cz";
    state.variables.push("GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL");
    state.values.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL = "calendar@gmail.com";
    expect(messages(state)).toEqual([
      "error: repository: variable GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL is not a service account address (…@<project>.iam.gserviceaccount.com)",
      "error: environment Production: variable DEPLOY_KNOWN_HOSTS is not known_hosts lines (<host> <key type> <key>)",
    ]);
  });

  it("needs write access of every reviewer", () => {
    const state = complete();
    state.values.CONTENT_REVIEWERS = "oplaner4, reader,ghost";
    state.reviewerAccess = { oplaner4: "admin", reader: "read", ghost: null };
    expect(messages(state)).toEqual([
      "error: repository: CONTENT_REVIEWERS names reader, who has read access: a review needs write access",
      "error: repository: CONTENT_REVIEWERS names ghost, a login GitHub does not know",
    ]);
    state.values.CONTENT_REVIEWERS = "oplaner4;reader";
    expect(messages(state)[0]).toBe(
      "error: repository: variable CONTENT_REVIEWERS is not GitHub logins separated by commas",
    );
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
