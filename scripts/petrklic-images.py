# Renders Petrklíč PDFs to WebP images for the Petrklíč pages (design/DESIGN.md §17–18).
# Every issue is a folder staged for /uploads/petrklic/ on the server:
#   uploads/petrklic/<id>/petrklic-<id>.pdf   the PDF (input)
#   uploads/petrklic/<id>/cover.webp          page 1, for the covers
#   uploads/petrklic/<id>/pages/<n>.webp      every page, for the "Listujte přímo zde" viewer (with --pages)
# Issues are given by id or by folder (`2026-2`, `uploads/petrklic/2026-2/`, `uploads/petrklic/*/`).
# Prints `<id> <page count>` per issue, for src/content/petrklic.ts.
# Requires pdftoppm (poppler-utils) and Pillow.
# Usage: python3 scripts/petrklic-images.py <id-or-folder> ... [--pages]
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
issues_dir = root / "uploads" / "petrklic"
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
  args = [a for a in sys.argv[1:] if a != "--pages"]
  with_pages = "--pages" in sys.argv[1:]
  if not args:
    sys.exit("Usage: python3 scripts/petrklic-images.py <id-or-folder> ... [--pages]")
  for pid in (pathlib.Path(a).name for a in args):
    issue = issues_dir / pid
    pdf = issue / f"petrklic-{pid}.pdf"
    if not pdf.is_file():
      sys.exit(f"Missing {pdf.relative_to(root)}")
    pages = page_count(pdf)
    with tempfile.TemporaryDirectory() as tmp:
      render(pdf, 1, 1, pathlib.Path(tmp))
      shutil.move(pathlib.Path(tmp) / "1.webp", issue / "cover.webp")
    if with_pages:
      shutil.rmtree(issue / "pages", ignore_errors=True)
      render(pdf, 1, pages, issue / "pages")
    print(pid, pages)


main()
