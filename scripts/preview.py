# Serves the static export like the web host does (`pnpm preview`, http://localhost:4173).
# out/ is the web root; /uploads/… comes from the local uploads/ folder (files staged by the farnost-* skills and
# not uploaded yet), and anything not staged there is redirected to the live site, where the uploaded files live.
# /virtualni_prohlidka/ (on the server only) is redirected to the live site, and misses get out/404.html like
# public/.htaccess does on the host.
# Usage: python3 scripts/preview.py [port]
import functools
import http.server
import pathlib
import posixpath
import sys
import urllib.parse

root = pathlib.Path(__file__).resolve().parent.parent
OUT = root / "out"
UPLOADS = root / "uploads"
PREFIX = "/uploads/"
TOUR = "/virtualni_prohlidka/"
LIVE = "https://farakurim.cz"


class Handler(http.server.SimpleHTTPRequestHandler):
  def translate_path(self, path):
    if not path.startswith(PREFIX):
      return super().translate_path(path)
    rel = posixpath.normpath(urllib.parse.unquote(urllib.parse.urlsplit(path).path)[len(PREFIX):])
    if rel.startswith(".."):
      return str(UPLOADS / "__outside__")
    return str(UPLOADS / rel)

  def send_head(self):
    if self.path.startswith(TOUR):
      self.send_response(302)
      self.send_header("Location", LIVE + self.path)
      self.end_headers()
      return None
    if self.path.startswith(PREFIX) and not pathlib.Path(self.translate_path(self.path)).is_file():
      self.send_response(302)
      self.send_header("Location", LIVE + self.path)
      self.end_headers()
      return None
    return super().send_head()

  def send_error(self, code, message=None, explain=None):
    page = OUT / "404.html"
    if code != 404 or not page.is_file():
      return super().send_error(code, message, explain)
    body = page.read_bytes()
    self.send_response(404)
    self.send_header("Content-Type", "text/html; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    if self.command != "HEAD":
      self.wfile.write(body)


if not OUT.is_dir():
  sys.exit("out/ is missing: run `pnpm build` first.")
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
handler = functools.partial(Handler, directory=str(OUT))
with http.server.ThreadingHTTPServer(("", port), handler) as server:
  print(f"Serving out/ at http://localhost:{port}/ ({PREFIX} from uploads/, else {LIVE})")
  server.serve_forever()
