import { describe, expect, it } from "vitest";
import { gitHubGet, gitHubText } from "./github";

describe("gitHubGet", () => {
  it("sends the API headers and names the path of a failed request", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const answer = (status: number) =>
      (async (url: string, init?: RequestInit) => {
        calls.push({ url, headers: init?.headers as Record<string, string> });
        return new Response(JSON.stringify({ ok: true }), { status });
      }) as typeof fetch;

    expect(await gitHubGet("o/r", "t0k", answer(200))("/pulls/7")).toEqual({ ok: true });
    expect(calls[0].url).toBe("https://api.github.com/repos/o/r/pulls/7");
    expect(calls[0].headers).toEqual({
      Authorization: "Bearer t0k",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    });
    await expect(gitHubGet("o/r", "t0k", answer(404))("/pulls/8")).rejects.toThrow("GitHub /pulls/8: 404");
    await expect(gitHubText("o/r", "t0k", answer(500))("/actions/jobs/1/logs")).rejects.toThrow(
      "GitHub /actions/jobs/1/logs: 500",
    );
  });
});
