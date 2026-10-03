// `pnpm dev`: the Next dev server (Turbopack, hot reload) behind a custom server
// (node_modules/next/dist/docs/01-app/02-guides/custom-server.md) that also answers /uploads/… like the web host:
// files staged in the local uploads/ folder are served from there, anything else is redirected to the live site.
// Only `pnpm dev` uses it; `pnpm build` stays a plain static export. `pnpm preview` does the same in scripts/preview.py.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";
import sirv from "sirv";

const PREFIX = "/uploads/";
const LIVE = "https://farakurim.cz";
const port = Number(process.env.PORT) || 3000;
const hostname = "localhost";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = next({ dev: true, turbopack: true, dir: root, hostname, port });
const handle = app.getRequestHandler();
const uploads = sirv(fileURLToPath(new URL("../uploads", import.meta.url)), { dev: true });

await app.prepare();

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  if (!url.startsWith(PREFIX)) return handle(req, res);
  // sirv looks the path up inside uploads/, so it gets the URL without the /uploads prefix.
  req.url = url.slice(PREFIX.length - 1);
  uploads(req, res, () => {
    res.writeHead(302, { Location: LIVE + url });
    res.end();
  });
});
server.on("upgrade", app.getUpgradeHandler());
server.listen(port, () => {
  console.log(`> Dev server at http://${hostname}:${port} (${PREFIX} from uploads/, else ${LIVE})`);
});
