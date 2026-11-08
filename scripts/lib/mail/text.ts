// The new text of an e-mail: what its sender wrote, without what a reply quotes, a forward carries or a signature adds.

/** A line from which on a reply quotes or a mail forwards an earlier message, or the signature starts. */
const CUT = [/^-- ?$/, /^Dne .+ napsal\(a\):$/, /^On .+ wrote:$/, /^-{3,} ?(Původní|Přeposlaná|Original|Forwarded) /i];

/** The new text of a mail: without quoted lines, a quoted or forwarded earlier message and the signature. */
export function mailText(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const end = lines.findIndex((line) => CUT.some((cut) => cut.test(line.trim())));
  return (end === -1 ? lines : lines.slice(0, end))
    .filter((line) => !line.startsWith(">"))
    .join("\n")
    .trim();
}
