"""Reads a Zonerama album of the parish for the Fotogalerie (design/DESIGN.md §19.2, farnost-create-galerie skill).
Without --write, prints JSON to confirm with the user: title (sentence case, without the "YYYY_MM_DD" prefix), date,
the proposed id, the chosen aspect ratio and the photo counts.
With --write, adds the Album record (up to 15 photos as { small, large } Zonerama URLs) to src/content/gallery.ts in
date order, keeps the newest MAX_ALBUMS albums and formats the file; --title, --date and --id override the proposal.
Usage: python3 scripts/zonerama-album.py https://eu.zonerama.com/FarnostKurim/Album/<id>
         [--write [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]]
"""
import argparse
import html as html_lib
import json
import pathlib
import re
import subprocess
import sys
import unicodedata
import urllib.request
from collections import Counter

MAX_PHOTOS = 15
MAX_ALBUMS = 6  # the Fotogalerie shows the 6 newest albums, older ones stay on Zonerama
SMALL, LARGE = 800, 1600  # widths: 2× a strip tile (about 390 px), and the homepage carousel
GALLERY = pathlib.Path(__file__).resolve().parent.parent / "src" / "content" / "gallery.ts"


def fetch(url):
  if not re.match(r"^https://(eu|www)\.zonerama\.com/FarnostKurim/Album/\d+", url):
    sys.exit("Expected an album URL: https://eu.zonerama.com/FarnostKurim/Album/<id> (not the profile or a tab)")
  with urllib.request.urlopen(url) as response:
    return response.read().decode("utf-8")


def title_and_date(page):
  """'2026_08_30 pouť Sedmiradostnou cestou na Vranov' → ('Pouť Sedmiradostnou cestou na Vranov', '2026-08-30')"""
  raw = html_lib.unescape(re.search(r"<title>(.*?) \| Zonerama", page, re.S).group(1)).strip()
  m = re.match(r"^(\d{4})_(\d{2})_(\d{2})\s+(.*)", raw)
  title, date = (m[4], f"{m[1]}-{m[2]}-{m[3]}") if m else (raw, "")
  return title[:1].upper() + title[1:], date


def photo_items(page):
  """The album's photos from `var result = {...}`, found by brace counting (a regex is unreliable on it)."""
  start = page.index("var result = {") + len("var result = ")
  depth = 0
  for end, c in enumerate(page[start:], start):
    depth += c == "{"
    depth -= c == "}"
    if depth == 0:
      break
  items = json.loads(page[start:end + 1])["items"]
  return [i for i in items if "photoId" in i and i.get("image") and 'data-type="video"' not in i.get("html", "")]


def ratio(photo):
  return round(int(photo["width"]) / int(photo["height"]), 2)


def select(photos):
  """The strips crop every photo to 4:3, so the album shows photos of one shape: the most common landscape aspect
  ratio, rounded to 2 dp (tolerates crops of a pixel or two, still separates 3:2 from 4:3). Uncropped first."""
  landscape = [p for p in photos if ratio(p) >= 1] or photos
  common = Counter(map(ratio, landscape)).most_common(1)[0][0]
  group = [p for p in landscape if ratio(p) == common]
  dims = Counter((p["width"], p["height"]) for p in group)
  group.sort(key=lambda p: -dims[(p["width"], p["height"])])
  return common, group


def url(photo, width):
  height = round(width * int(photo["height"]) / int(photo["width"]))
  return photo["image"].replace("{width}", str(width)).replace("{height}", str(height))


def slug(text):
  """'Pouť na Vranov' → 'pout-na-vranov'"""
  ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
  return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")


def record(album_id, title, date, number, photos):
  lines = [f'  {{\n    id: "{album_id}",\n    title: {json.dumps(title, ensure_ascii=False)},\n    date: "{date}",',
           f"    href: album({number}),\n    photoCount: {len(photos)},\n    photos: ["]
  lines += [f'      {{ small: "{p["small"]}", large: "{p["large"]}" }},' for p in photos]
  return "\n".join(lines) + "\n    ],\n  },\n"


def write(entry, album_id, date, number):
  """Inserts `entry` into `albums` in date order (newest first) and keeps the newest MAX_ALBUMS."""
  source = GALLERY.read_text()
  if f"album({number})" in source:
    sys.exit(f"Album {number} is already in gallery.ts")
  head, rest = source.split("export const albums: Album[] = [\n", 1)
  body, tail = rest.split("\n];", 1)
  blocks = re.findall(r"^  \{\n.*?^  \},\n", body + "\n", re.M | re.S)
  ids = [re.search(r'id: "([^"]+)"', b)[1] for b in blocks]
  if album_id in ids:
    sys.exit(f'The id "{album_id}" is already in gallery.ts: pass another one with --id')
  dates = [re.search(r'date: "([^"]+)"', b)[1] for b in blocks]
  at = next((i for i, d in enumerate(dates) if d <= date), len(blocks))
  blocks.insert(at, entry)
  dropped = [re.search(r'id: "([^"]+)"', b)[1] for b in blocks[MAX_ALBUMS:]]
  GALLERY.write_text(head + "export const albums: Album[] = [\n" + "".join(blocks[:MAX_ALBUMS]).rstrip("\n") +
                     "\n];" + tail)
  subprocess.run(["pnpm", "exec", "prettier", "--write", "--log-level", "warn", str(GALLERY)], check=True)
  return at, dropped


def main():
  parser = argparse.ArgumentParser(usage=__doc__)
  parser.add_argument("url")
  parser.add_argument("--write", action="store_true")
  parser.add_argument("--title")
  parser.add_argument("--date")
  parser.add_argument("--id")
  args = parser.parse_args()
  page = fetch(args.url)
  title, date = title_and_date(page)
  title, date = args.title or title, args.date or date
  album_id = args.id or slug(title)
  photos = photo_items(page)
  common, group = select(photos)
  chosen = [{"small": url(p, SMALL), "large": url(p, LARGE)} for p in group[:MAX_PHOTOS]]
  if not args.write:
    print(json.dumps({"id": album_id, "title": title, "date": date, "ratio": common, "total": len(photos),
                      "inRatio": len(group), "photos": len(chosen)}, ensure_ascii=False, indent=2))
    return
  if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date or ""):
    sys.exit("The album title has no date: pass the date of the event with --date YYYY-MM-DD")
  if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", album_id):
    sys.exit(f'"{album_id}" is not an ASCII kebab-case id: pass one with --id')
  number = re.search(r"/Album/(\d+)", args.url)[1]
  at, dropped = write(record(album_id, title, date, number, chosen), album_id, date, number)
  print(f"Added {album_id} ({len(chosen)} photos) at position {at + 1} in gallery.ts" +
        (f"; removed {', '.join(dropped)}" if dropped else ""))


main()
