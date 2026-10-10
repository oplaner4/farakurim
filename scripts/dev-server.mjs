// `pnpm dev`: the Next dev server (Turbopack, hot reload) behind a custom server
// (node_modules/next/dist/docs/01-app/02-guides/custom-server.md) that also answers /uploads/… and
// /virtualni_prohlidka/ like the web host (scripts/server-files.mjs).
// /favicon.ico, which browsers request by default, is redirected to the SVG icon: the site has no .ico, and the
// [...stranka] catch-all would answer it with a "missing param in generateStaticParams()" error in dev.
// Only `pnpm dev` uses it; `pnpm build` stays a plain static export, which `pnpm preview` serves (scripts/preview.mjs).
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";
import { redirect, SERVER_FILES_NOTE, serverFiles } from "./server-files.mjs";

const FAVICON = "/favicon.ico";
const ICON = "/icon.svg";
const port = Number(process.env.PORT) || 3000;
const hostname = "localhost";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = next({ dev: true, turbopack: true, dir: root, hostname, port });
const handle = app.getRequestHandler();
const files = serverFiles(root);

await app.prepare();

const server = createServer((req, res) => {
  if (req.url === FAVICON) return redirect(res, ICON);
  files(req, res, () => handle(req, res));
});
server.on("upgrade", app.getUpgradeHandler());
server.listen(port, () => {
  console.log(`> Dev server at http://${hostname}:${port} (${SERVER_FILES_NOTE})`);
});
