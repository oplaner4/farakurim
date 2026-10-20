// What `pnpm dev` (scripts/dev-server.mjs) and `pnpm preview` (scripts/preview.mjs) answer like the web host,
// where these files live on the server only: the uploaded files are served from the repo's folder of them (staged by
// the parish-* skills and not uploaded yet), and anything not staged there is redirected to the live site, where
// the uploaded files live. /virtualni_prohlidka/ (not in the build) is redirected to the live site too.
import { join } from "node:path";
import sirv from "sirv";

export const UPLOADS_PATH = "/uploads/"; // UPLOADS_PATH (src/lib/shared/uploads.ts); a test checks it
const TOUR = "/virtualni_prohlidka/";
export const LIVE = "https://farakurim.cz"; // SITE_URL (src/content/site.ts), which plain Node cannot import; a test checks it

/** A one-line description of the handling, for the servers' start-up message. */
export const SERVER_FILES_NOTE = `${UPLOADS_PATH} from ${UPLOADS_PATH.slice(1)}, else ${LIVE}`;

export function redirect(res, location, status = 302) {
  res.writeHead(status, { Location: location });
  res.end();
}

/** A request handler for the server-only files of the repo at `root`; calls `next` for any other URL. */
export function serverFiles(root) {
  const uploads = sirv(join(root, UPLOADS_PATH.slice(1)), { dev: true });
  return (req, res, next) => {
    const url = req.url ?? "/";
    if (url.startsWith(TOUR)) return redirect(res, LIVE + url);
    if (!url.startsWith(UPLOADS_PATH)) return next();
    // sirv looks the path up inside the folder, so it gets the URL without the folder's prefix.
    req.url = url.slice(UPLOADS_PATH.length - 1);
    uploads(req, res, () => redirect(res, LIVE + url));
  };
}
