import { describe, expect, it } from "vitest";
import { isFixRequest, replyMarker, unansweredRequests, type IssueComment } from "./comments";

function comment(over: Partial<IssueComment> & { id: number }): IssueComment {
  return {
    body: "/fix the time",
    createdAt: "2026-10-26T10:00:00Z",
    author: "ondrej",
    authorType: "User",
    association: "OWNER",
    ...over,
  };
}

describe("replyMarker", () => {
  it("names the comment it answers", () => {
    expect(replyMarker(123)).toBe("<!-- content-fix: 123 -->");
  });
});

describe("isFixRequest", () => {
  it("takes a comment that starts with the /fix command", () => {
    for (const body of ["/fix change the time", "/fix\nq2: correct as is", "/fix"]) {
      expect(isFixRequest(comment({ id: 1, body }))).toBe(true);
    }
  });

  it("ignores /fix inside the text, a longer word and the old @claude mention", () => {
    for (const body of [
      "Please /fix the time",
      " /fix the time",
      "/fixed it myself",
      "/fix-up",
      "@claude fix the time",
    ]) {
      expect(isFixRequest(comment({ id: 1, body }))).toBe(false);
    }
  });
});

describe("unansweredRequests", () => {
  it("takes requests from writers' associations, oldest first", () => {
    const comments = [
      comment({ id: 3 }),
      comment({ id: 2, association: "CONTRIBUTOR" }),
      comment({ id: 4, createdAt: "2026-10-26T09:00:00Z", association: "COLLABORATOR" }),
    ];
    expect(unansweredRequests(comments).map((c) => c.id)).toEqual([4, 3]);
  });

  it("ignores bots and answered comments", () => {
    const comments = [
      comment({ id: 1, authorType: "Bot", body: "/fix in the bot's own reply" }),
      comment({ id: 2 }),
      comment({ id: 3 }),
      comment({ id: 4, authorType: "Bot", body: `Done.\n${replyMarker(2)}` }),
      comment({ id: 5, body: `/fix quoting ${replyMarker(3)}` }),
    ];
    expect(isFixRequest(comments[0])).toBe(false);
    expect(unansweredRequests(comments).map((c) => c.id)).toEqual([3, 5]);
  });
});
