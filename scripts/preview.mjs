// `pnpm preview`: serves the static export like the web host does (http://localhost:4173). out/ is the web root,
// /uploads/… and /virtualni_prohlidka/ are answered as on the server (scripts/server-files.mjs), a folder without
// its trailing slash is redirected to it as Apache does, and misses get out/404.html like public/.htaccess does on
// the host. out/ is read on every request, so a `pnpm build` shows without a restart.
// Usage: node scripts/preview.mjs [port]
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { redirect, SERVER_FILES_NOTE, serverFiles } from "./server-files.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "out");
const port = Number(process.argv[2]) || 4173;

if (!existsSync(out)) {
  console.error("out/ is missing: run `pnpm build` first.");
  process.exit(1);
}

function notFound(req, res) {
  const page = join(out, "404.html");
  if (!existsSync(page)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(req.method === "HEAD" ? undefined : readFileSync(page));
}

const files = serverFiles(root);
const site = sirv(out, { dev: true, onNoMatch: notFound });

createServer((req, res) => {
  files(req, res, () => {
    const { pathname, search } = new URL(req.url ?? "/", "http://localhost");
    if (!pathname.endsWith("/") && existsSync(join(out, decodeURIComponent(pathname), "index.html"))) {
      return redirect(res, `${pathname}/${search}`, 301);
    }
    site(req, res);
  });
}).listen(port, () => {
  console.log(`Serving out/ at http://localhost:${port}/ (${SERVER_FILES_NOTE})`);
});
