import { describe, expect, it } from "vitest";
import { readRepository } from "./read";

/** A fetch that answers each path under /repos/o/r from `routes` (the query included), and 404 otherwise. */
function api(routes: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const path = url.replace("https://api.github.com/repos/o/r", "");
    if (!(path in routes)) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(routes[path]), { status: 200 });
  }) as typeof fetch;
}

const page = (key: string, total: number, list: string[]) => ({
  total_count: total,
  [key]: list.map((name) => ({ name })),
});
const empty = (key: string) => page(key, 0, []);

describe("readRepository", () => {
  it("reads the settings, the environments and the rulesets", async () => {
    const thirty = Array.from({ length: 30 }, (_, i) => `VAR_${i}`);
    const state = await readRepository(
      "o/r",
      "t",
      api({
        "": { allow_squash_merge: true },
        "/actions/variables?per_page=30&page=1": page("variables", 31, thirty),
        "/actions/variables?per_page=30&page=2": page("variables", 31, ["VAR_30"]),
        "/actions/secrets?per_page=100&page=1": page("secrets", 1, ["KEY"]),
        "/environments?per_page=100": {
          environments: [
            {
              name: "Production",
              protection_rules: [{ type: "branch_policy" }],
              deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
            },
            {
              name: "content fix",
              protection_rules: [{ type: "required_reviewers" }],
              deployment_branch_policy: null,
            },
          ],
        },
        "/environments/Production/deployment-branch-policies?per_page=100": {
          branch_policies: [{ name: "main" }, { name: "v*", type: "tag" }],
        },
        "/environments/Production/variables?per_page=30&page=1": page("variables", 1, ["HOSTS"]),
        "/environments/Production/secrets?per_page=100&page=1": page("secrets", 1, ["SSH"]),
        "/environments/content%20fix/variables?per_page=30&page=1": empty("variables"),
        "/environments/content%20fix/secrets?per_page=100&page=1": empty("secrets"),
        "/rulesets?per_page=100": [{ id: 7 }],
        "/rulesets/7": {
          name: "check",
          target: "branch",
          enforcement: "active",
          conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
          rules: [
            { type: "required_status_checks", parameters: { required_status_checks: [{ context: "check" }] } },
            { type: "deletion" },
          ],
          bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "always" }],
        },
      }),
    );
    expect(state).toEqual({
      squashMerge: true,
      variables: [...thirty, "VAR_30"],
      secrets: ["KEY"],
      environments: [
        {
          name: "Production",
          requiredReviewers: false,
          deployFrom: [
            { type: "branch", name: "main" },
            { type: "tag", name: "v*" },
          ],
          variables: ["HOSTS"],
          secrets: ["SSH"],
        },
        { name: "content fix", requiredReviewers: true, deployFrom: "all", variables: [], secrets: [] },
      ],
      rulesets: [
        {
          name: "check",
          target: "branch",
          enforcement: "active",
          include: ["~DEFAULT_BRANCH"],
          rules: [
            { type: "required_status_checks", checks: ["check"] },
            { type: "deletion", checks: [] },
          ],
          bypass: [{ type: "RepositoryRole", id: 5 }],
        },
      ],
    });
  });

  it("leaves out what the token may not see, and names a path it may not read", async () => {
    const routes = {
      "": {},
      "/actions/variables?per_page=30&page=1": empty("variables"),
      "/environments?per_page=100": { environments: [] },
      "/rulesets?per_page=100": [{ id: 1 }],
      "/rulesets/1": { name: "r", target: "branch", enforcement: "active" },
    };
    await expect(readRepository("o/r", "t", api(routes))).rejects.toThrow(
      "GitHub /actions/secrets?per_page=100&page=1: 404",
    );
    const state = await readRepository(
      "o/r",
      "t",
      api({ ...routes, "/actions/secrets?per_page=100&page=1": empty("secrets") }),
    );
    expect(state.squashMerge).toBeNull();
    expect(state.rulesets).toEqual([
      { name: "r", target: "branch", enforcement: "active", include: [], rules: [], bypass: null },
    ]);
  });
});
