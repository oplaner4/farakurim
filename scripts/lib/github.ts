// The GitHub REST API of one repo, as the scripts read it: the headers and the failure message in one place.

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function request(repo: string, token: string, fetchImpl: typeof fetch, path: string): Promise<Response> {
  const response = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, { headers: headers(token) });
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
