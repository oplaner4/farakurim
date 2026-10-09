"""Stages a content file in uploads/ for /uploads/ on the server and prints the lines for src/content/
(farnost-create-aktualita, farnost-create-porad-bohosluzeb and farnost-create-petrklic skills).
Every command checks the name is still free on the site (files on the server are never overwritten), copies the file
under its ASCII name and renders the images. --check only validates and prints, without copying or rendering: use it
before the user confirms, so nothing unconfirmed is left in uploads/ for the next release.

  aktualita <source> <id> <label> [--title "<title>"] [--poster | --no-poster] [--record <record.json>]
      uploads/aktuality/<id>-<label>.<ext>, plus <id>-<label>.webp (page 1 / scaled image) for a visual label
      (Plakát, Pozvánka, Leták); prints the `poster` and `attachments` lines. --record adds them to the confirmed
      NewsEvent in the JSON file and adds it to src/content/news/ (scripts/add-aktualita.ts; with --check it only
      validates the record).
  porad <pdf> [--from YYYY-MM-DD --to YYYY-MM-DD] [--rev N]
      reads the week from the heading ("od 4. 10. 2026 do 11. 10. 2026"), stages
      uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-<N>].pdf; prints pdfUrl, the week and its days.
      --rev 2 names a corrected PDF of a week already on the server.
  petrklic <pdf> <id> [--note "<note>"]
      uploads/petrklic/<id>/petrklic-<id>.pdf with cover.webp and pages/ (scripts/petrklic-images.py --pages);
      prints the `issue(...)` line.

Requires pdftotext, pdfinfo and pdftoppm (poppler-utils) and Pillow.
Usage: python3 scripts/stage-upload.py <command> ... [--check]
"""
import argparse
import datetime
import json
import pathlib
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
uploads = root / "uploads"
# The site's address lives in scripts/deploy.sh (SITE=…), with the other server details.
SITE = re.search(r"^SITE=(\S+)", (root / "scripts" / "deploy.sh").read_text(), re.M)[1]
MB = 1024 * 1024

# Attachment label → file name suffix; the visual ones also become the event's poster.
LABELS = {"Plakát": "plakat", "Pozvánka": "pozvanka", "Program": "program", "Leták": "letak", "Informace": "informace",
          "Oznámení": "oznameni"}
VISUAL = {"Plakát", "Pozvánka", "Leták"}
EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".m4a", ".ogg", ".wav", ".mp4", ".webm",
              ".mov"}
KEBAB = r"[a-z0-9]+(-[a-z0-9]+)*"
WEEKDAYS = ["po", "út", "st", "čt", "pá", "so", "ne"]


def fail(message):
  sys.exit(f"stage-upload: {message}")


def source_file(path, max_mb):
  src = pathlib.Path(path).expanduser()
  if not src.is_file() and not src.parent.name:
    src = pathlib.Path.home() / "Downloads" / path
  if not src.is_file():
    fail(f"{path} not found (also looked in ~/Downloads/)")
  if src.stat().st_size > max_mb * MB:
    fail(f"{src.name} is {src.stat().st_size / MB:.1f} MB, over {max_mb} MB: ask the user for a smaller file")
  return src


def check_free(rel, taken_hint):
  """Refuses a name that is already on the server."""
  url = f"{SITE}/uploads/{rel}"
  try:
    urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=15)
    fail(f"{url} already exists on the server: {taken_hint}")
  except urllib.error.HTTPError as error:
    if error.code != 404:
      fail(f"{url} answered {error.code}: cannot tell whether the name is free")
  except urllib.error.URLError as error:
    fail(f"cannot reach {SITE} ({error.reason}): cannot tell whether the name is free")


def stage(src, rel, check, taken_hint="pick another id"):
  dest = uploads / rel
  if dest.exists() and dest.read_bytes() != src.read_bytes():
    fail(f"uploads/{rel} is already staged with other content")
  check_free(rel, taken_hint)
  if not check:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
  return dest


def run(*args):
  return subprocess.run(args, capture_output=True, text=True, check=True).stdout


def aktualita(args):
  label = next((l for l, suffix in LABELS.items() if args.label in (l, suffix)), None)
  if not label:
    fail(f"unknown label {args.label!r}: one of {', '.join(LABELS)}")
  if not re.fullmatch(KEBAB, args.id):
    fail(f"{args.id!r} is not an ASCII kebab-case id")
  src = source_file(args.source, 10)
  ext = src.suffix.lower().replace(".jpeg", ".jpg")
  if ext not in EXTENSIONS:
    fail(f"{src.suffix} is not an image, PDF, audio or video file")
  name = f"{args.id}-{LABELS[label]}"
  poster = args.poster if args.poster is not None else label in VISUAL
  if poster and ext not in {".pdf", ".png", ".jpg", ".webp", ".gif"}:
    fail(f"a {ext} file cannot be a poster: pass --no-poster")
  record = None
  if args.record:
    record = json.loads(pathlib.Path(args.record).read_text(encoding="utf-8"))
    if record.get("id") != args.id:
      fail(f"the record's id {record.get('id')!r} is not {args.id!r}")
    title = args.title or record.get("title") or "<title>"
    if poster:
      # Keep an alt text the record already has (it may add the date); the src is always the staged WebP.
      alt = (record.get("poster") or {}).get("alt") or f"{label}: {title}"
      record["poster"] = {"src": f"/uploads/aktuality/{name}.webp", "alt": alt}
    record["attachments"] = [{"label": label, "file": f"/uploads/aktuality/{name}{ext}", "size": src.stat().st_size}]
    # Validate before anything is copied, so a bad record leaves nothing staged.
    add_record(record, check=True)
  dest = stage(src, f"aktuality/{name}{ext}", args.check)
  if poster and not args.check:
    run(sys.executable, str(root / "scripts" / "poster-webp.py"), str(dest), str(dest.with_suffix(".webp")))
  alt = json.dumps(f"{label}: {args.title or (record or {}).get('title') or '<title>'}", ensure_ascii=False)
  print(f"{'Would stage' if args.check else 'Staged'} uploads/aktuality/{name}{ext}" + (" and .webp" if poster else ""))
  if record is None:
    if poster:
      print(f"    poster: {{ src: `${{UPLOADS}}/{name}.webp`, alt: {alt} }},")
    print(f'    attachments: [{{ label: "{label}", file: `${{UPLOADS}}/{name}{ext}`, size: {src.stat().st_size} }}],')
  elif not args.check:
    sys.stdout.flush()
    add_record(record, check=False)


def add_record(record, check):
  """Adds the NewsEvent to src/content/news/ with scripts/add-aktualita.ts (or only validates it)."""
  # shutil.which finds pnpm.cmd on Windows, which subprocess cannot start by its bare name.
  command = [shutil.which("pnpm") or "pnpm", "--silent", "add-aktualita", "-"] + (["--check"] if check else [])
  if subprocess.run(command, input=json.dumps(record, ensure_ascii=False), text=True, cwd=root).returncode != 0:
    fail("the record was not added (see above)")


def iso(day, month, year):
  return datetime.date(int(year), int(month), int(day))


def week(src, args):
  """'od 30. 11. 2025 do 7. 12. 2025' or 'od 30. 11. do 7. 12. 2025' → (2025-11-30, 2025-12-07)"""
  if args.valid_from and args.valid_to:
    return datetime.date.fromisoformat(args.valid_from), datetime.date.fromisoformat(args.valid_to)
  text = re.sub(r"\s+", " ", run("pdftotext", "-l", "1", str(src), "-"))
  m = re.search(r"od (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})? ?do (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})", text, re.I)
  if not m:
    fail("no 'od … do …' week in the PDF heading: pass --from and --to")
  start_year = m[3] or (int(m[6]) - 1 if int(m[2]) > int(m[5]) else m[6])
  return iso(m[1], m[2], start_year), iso(m[4], m[5], m[6])


def porad(args):
  src = source_file(args.source, 20)
  if src.suffix.lower() != ".pdf":
    fail("the pořad bohoslužeb is a PDF")
  valid_from, valid_to = week(src, args)
  # One week, or two around holidays (Sunday to Sunday is 14 days); anything longer is a misread heading.
  if not 0 < (valid_to - valid_from).days <= 21:
    fail(f"the period {valid_from} – {valid_to} looks wrong: pass --from and --to")
  rel = f"porady_bohosluzeb/{valid_from}-porad-bohosluzeb{f'-{args.rev}' if args.rev else ''}.pdf"
  stage(src, rel, args.check, f"this week is already published; for a corrected PDF pass --rev {(args.rev or 1) + 1}")
  days = [valid_from + datetime.timedelta(n) for n in range((valid_to - valid_from).days + 1)]
  print(f"{'Would stage' if args.check else 'Staged'} uploads/{rel}")
  print(f'  pdfUrl: "/uploads/{rel}",\n  validFrom: "{valid_from}",\n  validTo: "{valid_to}",')
  print("days:", ", ".join(f"{WEEKDAYS[d.weekday()]} {d}" for d in days))


def petrklic(args):
  m = re.fullmatch(r"(\d{4})-(\d{1,2})(-[a-z0-9]+(-[a-z0-9]+)*)?", args.id)
  if not m:
    fail(f"{args.id!r} is not <year>-<number>[-<note>], e.g. 2026-2 or 2026-3-mimoradne")
  src = source_file(args.source, 40)
  if src.suffix.lower() != ".pdf":
    fail("the Petrklíč is a PDF")
  rel = f"petrklic/{args.id}/petrklic-{args.id}.pdf"
  stage(src, rel, args.check)
  if args.check:
    pages = int(re.search(r"^Pages:\s+(\d+)", run("pdfinfo", str(src)), re.M)[1])
  else:
    pages = int(run(sys.executable, str(root / "scripts" / "petrklic-images.py"), args.id, "--pages").split()[-1])
  extra = f", {{ note: {json.dumps(args.note, ensure_ascii=False)} }}" if args.note else ""
  print(f"{'Would stage' if args.check else 'Staged'} uploads/petrklic/{args.id}/ (PDF"
        + (")" if args.check else ", cover.webp, pages/)") + f", {pages} pages")
  print(f'  issue("{args.id}", {m[1]}, {int(m[2])}, {pages}{extra}),')


def main():
  parser = argparse.ArgumentParser(usage=__doc__)
  commands = parser.add_subparsers(dest="command", required=True)
  a = commands.add_parser("aktualita")
  a.add_argument("source")
  a.add_argument("id")
  a.add_argument("label")
  a.add_argument("--title")
  a.add_argument("--poster", action=argparse.BooleanOptionalAction, default=None)
  a.add_argument("--record")
  p = commands.add_parser("porad")
  p.add_argument("source")
  p.add_argument("--from", dest="valid_from")
  p.add_argument("--to", dest="valid_to")
  p.add_argument("--rev", type=int)
  k = commands.add_parser("petrklic")
  k.add_argument("source")
  k.add_argument("id")
  k.add_argument("--note")
  for command in (a, p, k):
    command.add_argument("--check", action="store_true")
  args = parser.parse_args()
  {"aktualita": aktualita, "porad": porad, "petrklic": petrklic}[args.command](args)


main()
