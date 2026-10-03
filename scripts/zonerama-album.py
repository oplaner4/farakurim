"""Reads a Zonerama album of the parish for the Fotogalerie (design/DESIGN.md §19.2, farnost-create-galerie skill).
Prints JSON: title (sentence case, without the "YYYY_MM_DD" prefix), date, the chosen aspect ratio, photo counts,
and up to 15 photos as { small, large } URLs served by Zonerama.
Usage: python3 scripts/zonerama-album.py https://eu.zonerama.com/FarnostKurim/Album/<id>
"""
import html as html_lib
import json
import re
import sys
import urllib.request
from collections import Counter

MAX_PHOTOS = 15
SMALL, LARGE = 800, 1600  # widths: 2× a strip tile (about 390 px), and the homepage carousel


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


def main():
  if len(sys.argv) != 2:
    sys.exit(__doc__)
  page = fetch(sys.argv[1])
  title, date = title_and_date(page)
  photos = photo_items(page)
  common, group = select(photos)
  print(json.dumps({
    "title": title,
    "date": date,
    "ratio": common,
    "total": len(photos),
    "inRatio": len(group),
    "photos": [{"small": url(p, SMALL), "large": url(p, LARGE)} for p in group[:MAX_PHOTOS]],
  }, ensure_ascii=False, indent=2))


main()
