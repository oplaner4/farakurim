# Serves the static export like the web host does (`pnpm preview`, http://localhost:4173).
# out/ is the web root; /uploads/… comes from the local uploads/ folder (files staged by the farnost-* skills and
# not uploaded yet), and anything not staged there is redirected to the live site, where the uploaded files live.
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
    if self.path.startswith(PREFIX) and not pathlib.Path(self.translate_path(self.path)).is_file():
      self.send_response(302)
      self.send_header("Location", LIVE + self.path)
      self.end_headers()
      return None
    return super().send_head()


if not OUT.is_dir():
  sys.exit("out/ is missing: run `pnpm build` first.")
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
handler = functools.partial(Handler, directory=str(OUT))
with http.server.ThreadingHTTPServer(("", port), handler) as server:
  print(f"Serving out/ at http://localhost:{port}/ ({PREFIX} from uploads/, else {LIVE})")
  server.serve_forever()
