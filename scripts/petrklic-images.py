# Renders Petrklíč PDFs to WebP images for the Petrklíč pages (design/DESIGN.md §17–18).
# Every PDF given, or every `*.pdf` in a given folder, gets a cover from page 1; its id is the file name up to the
# first dot (`2026-2.pdf`, or `<id>.petrklic.pdf` in the old site's nahrane/petrklice/). The ids passed with
# --pages also get every page, for the "Listujte přímo zde" viewer.
# Prints `<id> <page count>` per PDF, for `pages` in src/content/petrklic.ts.
# Requires pdftoppm (poppler-utils) and Pillow.
# Usage: python3 scripts/petrklic-images.py <pdf-or-dir> ... [--pages <id> ...]
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
out_dir = root / "uploads" / "petrklic"  # staged for /uploads/petrklic/ on the server, next to the PDFs
WIDTH = 600  # 2× the largest cover and viewer page (300 px)


def render(pdf, first, last, dest_dir):
  """Renders pages first..last to `<dest_dir>/<n>.webp`."""
  dest_dir.mkdir(parents=True, exist_ok=True)
  with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["pdftoppm", "-f", str(first), "-l", str(last), "-scale-to-x", str(WIDTH), "-scale-to-y", "-1",
                    "-png", str(pdf), f"{tmp}/p"], check=True)
    for png in sorted(pathlib.Path(tmp).glob("p-*.png")):
      n = int(png.stem.split("-")[-1])
      Image.open(png).convert("RGB").save(dest_dir / f"{n}.webp", quality=72, method=6)


def page_count(pdf):
  info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
  return int(next(line.split()[-1] for line in info.splitlines() if line.startswith("Pages:")))


def main():
  args = sys.argv[1:]
  if not args:
    sys.exit("Usage: python3 scripts/petrklic-images.py <pdf-or-dir> ... [--pages <id> ...]")
  split = args.index("--pages") if "--pages" in args else len(args)
  with_pages = set(args[split + 1:])
  pdfs = []
  for arg in map(pathlib.Path, args[:split]):
    pdfs += sorted(arg.glob("*.pdf")) if arg.is_dir() else [arg]
  for pdf in pdfs:
    pid = pdf.name.split(".")[0]
    pages = page_count(pdf)
    with tempfile.TemporaryDirectory() as tmp:
      render(pdf, 1, 1, pathlib.Path(tmp))
      shutil.move(pathlib.Path(tmp) / "1.webp", out_dir / f"{pid}.webp")
    if pid in with_pages:
      render(pdf, 1, pages, out_dir / pid)
    print(pid, pages)


out_dir.mkdir(parents=True, exist_ok=True)
main()
