// The GitHub REST API of one repo, as the scripts read and write it: the headers and the failure message in one
// place, and the comments of an issue or PR.

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function request(
  repo: string,
  token: string,
  fetchImpl: typeof fetch,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, { ...init, headers: headers(token) });
  if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
  return response;
}

/** A reader of the JSON at `path` under /repos/{repo} (`/pulls/7`); a failed request throws `GitHub <path>: <status>`. */
export function gitHubGet(repo: string, token: string, fetchImpl: typeof fetch = fetch) {
  return async <T>(path: string): Promise<T> => (await request(repo, token, fetchImpl, path)).json() as Promise<T>;
}

/** A reader of the plain text at `path`, such as a job log (the API redirects to it, and fetch follows). */
export function gitHubText(repo: string, token: string, fetchImpl: typeof fetch = fetch) {
  return async (path: string): Promise<string> => (await request(repo, token, fetchImpl, path)).text();
}

/** A writer that POSTs `body` as JSON to `path` under /repos/{repo}; a failed request throws `GitHub <path>: <status>`. */
export function gitHubPost(repo: string, token: string, fetchImpl: typeof fetch = fetch) {
  return async (path: string, body: unknown): Promise<void> => {
    await request(repo, token, fetchImpl, path, { method: "POST", body: JSON.stringify(body) });
  };
}

/** An issue or PR comment as the API gives it. */
export type ApiIssueComment = {
  id: number;
  body: string;
  created_at: string;
  user: { login: string; type: string } | null;
  author_association: string;
};

/** All comments of the issue or PR `number`, oldest first, read with `get` (gitHubGet()) a page at a time. */
export async function issueComments(get: ReturnType<typeof gitHubGet>, number: number): Promise<ApiIssueComment[]> {
  const found: ApiIssueComment[] = [];
  for (let page = 1; ; page++) {
    const batch = await get<ApiIssueComment[]>(`/issues/${number}/comments?per_page=100&page=${page}`);
    found.push(...batch);
    if (batch.length < 100) return found;
  }
}
