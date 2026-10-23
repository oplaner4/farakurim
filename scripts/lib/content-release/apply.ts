// Copies the downloaded artifacts of a content release plan into the staging folder, after checking that every file
// is one its PR's kind may upload.

import { copyFileSync, lstatSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, extname, join, sep } from "node:path";
import { UPLOAD_EXTENSIONS, UPLOADS_PATH } from "@/lib/shared/uploads";
import { KINDS, type ContentPull, type ReleasePlan } from "./plan";

/** An artifact's name as the plan gives it: one of the two names above, nothing that could be a path. */
const ARTIFACT_NAME = /^(content-uploads|service-sheet-pdf)-[0-9a-f]+$/;

/**
 * The files under `dir` as paths relative to it, separated by `/` on Windows too; a symlink or anything but a file or
 * folder throws.
 */
function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" }).flatMap((path) => {
    const stat = lstatSync(join(dir, path));
    if (stat.isDirectory()) return [];
    if (!stat.isFile()) throw new Error(`${join(dir, path)} is not a regular file`);
    return [path.split(sep).join("/")];
  });
}

/** The files of one downloaded artifact of a PR and where each goes under uploads/; a file its kind may not write throws. */
function artifactCopies(pull: ContentPull, name: string, from: string): { src: string; rel: string }[] {
  if (!ARTIFACT_NAME.test(name)) throw new Error(`PR #${pull.number}: ${name} is not an artifact name`);
  const legacy = name.startsWith("service-sheet-pdf-");
  if (legacy && pull.kind !== "sheet") throw new Error(`PR #${pull.number}: ${name} belongs to a sheet PR only`);
  const { folder } = KINDS[pull.kind];
  const dir = join(from, name);
  return filesIn(dir).map((path) => {
    // A legacy artifact holds the sheet PDFs flat.
    const rel = legacy ? `${folder}${path}` : path;
    const allowed =
      (!legacy || !path.includes("/")) &&
      rel.startsWith(folder) &&
      !rel.split("/").includes("..") &&
      UPLOAD_EXTENSIONS.includes(extname(rel));
    if (!allowed) throw new Error(`PR #${pull.number}: ${name} holds ${path}, which a ${pull.kind} PR may not upload`);
    return { src: join(dir, path), rel };
  });
}

/**
 * Copies the downloaded artifacts of a release plan (each in `<from>/<artifact name>/`) into `uploads`, PR by PR and
 * commit by commit in the plan's order, so a later file of the same path wins. A blocked plan's artifacts are copied
 * too, for a release by hand. Every file is checked first, and one
 * that its PR's kind may not write stops it before anything is copied. Returns the copied paths under `uploads`.
 */
export function applyArtifacts({
  plan,
  from,
  uploads,
}: {
  plan: ReleasePlan;
  from: string;
  uploads: string;
}): string[] {
  if (plan.action !== "release" && plan.action !== "blocked") return [];
  const copies = plan.pulls.flatMap((pull) => pull.artifacts.flatMap(({ name }) => artifactCopies(pull, name, from)));
  for (const { src, rel } of copies) {
    const dest = join(uploads, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return copies.map((copy) => copy.rel);
}

/**
 * One message per uploaded-file link a PR adds (`linksOf` its squash commit) whose file is not staged (`staged`, a
 * path under the staging folder: copied from an artifact, or staged by hand for a release by hand), so nothing in the
 * release links a file that may exist only on the machine of whoever pushed a commit by hand.
 */
export function missingLinks(
  pulls: ContentPull[],
  staged: (rel: string) => boolean,
  linksOf: (sha: string) => string[],
): string[] {
  return pulls.flatMap((pull) =>
    linksOf(pull.sha)
      .filter((link) => !staged(link.slice(UPLOADS_PATH.length)))
      .map(
        (link) =>
          `PR #${pull.number} links ${link}, which no artifact holds: stage it and release with pnpm release by hand`,
      ),
  );
}
