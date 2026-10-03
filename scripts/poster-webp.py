"""Renders an event poster (page 1 of a PDF, or a PNG/JPG) to a WebP for the Aktuality pages (design/DESIGN.md §11, §13).
The result goes next to the original in the staging folder and is uploaded with it (farnost-create-aktualita skill).
Prints the WebP's path and `<width>x<height>`.
Requires pdftoppm (poppler-utils) for PDFs, and Pillow.
Usage: python3 scripts/poster-webp.py <poster.pdf|png|jpg> <out.webp>
"""
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image

WIDTH = 680  # 2× the largest poster box (340 px wide on the detail page)


def main():
  if len(sys.argv) != 3:
    sys.exit(__doc__)
  src, dest = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
  with tempfile.TemporaryDirectory() as tmp:
    if src.suffix.lower() == ".pdf":
      subprocess.run(["pdftoppm", "-f", "1", "-l", "1", "-scale-to-x", str(WIDTH), "-scale-to-y", "-1", "-png",
                      "-singlefile", str(src), f"{tmp}/p"], check=True)
      image = Image.open(f"{tmp}/p.png")
    else:
      image = Image.open(src)
      if image.width > WIDTH:
        image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(dest, quality=78, method=6)
  print(dest, f"{image.width}x{image.height}")


main()
