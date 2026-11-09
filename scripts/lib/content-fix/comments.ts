export type IssueComment = {
  id: number;
  body: string;
  createdAt: string;
  author: string;
  authorType: string;
  association: string;
};

const WRITER_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

/** How a reply's marker starts. */
export const MARKER_START = "<!-- content-fix:";

/** The line a reply carries, so the comment it answers is never answered twice. */
export function replyMarker(commentId: number): string {
  return `${MARKER_START} ${commentId} -->`;
}

/**
 * The command a request starts with, followed by a space, a line break or nothing. Not an @-mention: a mention on this
 * public repo would notify whoever owns that GitHub account.
 */
const FIX_COMMAND = /^\/fix(?:\s|$)/;

/** A comment asking the agent for a fix: starts with `/fix`, from a writer's association, not from a bot. */
export function isFixRequest(comment: IssueComment): boolean {
  return FIX_COMMAND.test(comment.body) && WRITER_ASSOCIATIONS.has(comment.association) && comment.authorType !== "Bot";
}

/** The requests no bot comment answers yet (by its marker), oldest first. */
export function unansweredRequests(comments: IssueComment[]): IssueComment[] {
  const botBodies = comments.filter((c) => c.authorType === "Bot").map((c) => c.body);
  return comments
    .filter((c) => isFixRequest(c) && !botBodies.some((body) => body.includes(replyMarker(c.id))))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}
