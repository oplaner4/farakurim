export type IssueComment = {
  id: number;
  body: string;
  createdAt: string;
  author: string;
  authorType: string;
  association: string;
};

const WRITER_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

/** The line a reply carries, so the comment it answers is never answered twice. */
export function replyMarker(commentId: number): string {
  return `<!-- content-fix: ${commentId} -->`;
}

/** A comment asking Claude for a fix: mentions `@claude`, from a writer's association, not from a bot. */
export function isFixRequest(comment: IssueComment): boolean {
  return (
    comment.body.includes("@claude") && WRITER_ASSOCIATIONS.has(comment.association) && comment.authorType !== "Bot"
  );
}

/** The requests no bot comment answers yet (by its marker), oldest first. */
export function unansweredRequests(comments: IssueComment[]): IssueComment[] {
  const botBodies = comments.filter((c) => c.authorType === "Bot").map((c) => c.body);
  return comments
    .filter((c) => isFixRequest(c) && !botBodies.some((body) => body.includes(replyMarker(c.id))))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}
