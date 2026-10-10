// What `pnpm dev` (scripts/dev-server.mjs) and `pnpm preview` (scripts/preview.mjs) answer like the web host,
// where these files live on the server only: /uploads/… is served from the local uploads/ folder (files staged by
// the farnost-* skills and not uploaded yet), and anything not staged there is redirected to the live site, where
// the uploaded files live. /virtualni_prohlidka/ (not in the build) is redirected to the live site too.
import { join } from "node:path";
import sirv from "sirv";

const PREFIX = "/uploads/";
const TOUR = "/virtualni_prohlidka/";
export const LIVE = "https://farakurim.cz"; // SITE_URL (src/content/site.ts), which plain Node cannot import

/** A one-line description of the handling, for the servers' start-up message. */
export const SERVER_FILES_NOTE = `${PREFIX} from uploads/, else ${LIVE}`;

export function redirect(res, location, status = 302) {
  res.writeHead(status, { Location: location });
  res.end();
}

/** A request handler for the server-only files of the repo at `root`; calls `next` for any other URL. */
export function serverFiles(root) {
  const uploads = sirv(join(root, "uploads"), { dev: true });
  return (req, res, next) => {
    const url = req.url ?? "/";
    if (url.startsWith(TOUR)) return redirect(res, LIVE + url);
    if (!url.startsWith(PREFIX)) return next();
    // sirv looks the path up inside uploads/, so it gets the URL without the /uploads prefix.
    req.url = url.slice(PREFIX.length - 1);
    uploads(req, res, () => redirect(res, LIVE + url));
  };
}
