# Renders the design-tool mockups (design/mockups/*.dc.html) to static HTML for visual comparison.
# Usage: python3 scripts/render-mockups.py [out-dir]  (default: .design-preview, served by `pnpm mockups`)
# Sample values match the build data on Saturday 3. 10. 2026 (next mass: Sunday 8:00).
import pathlib
import re
import shutil
import sys
root = pathlib.Path(__file__).resolve().parent.parent
src_dir = root / "design" / "mockups"
out_dir = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / ".design-preview"
(out_dir / "mockups").mkdir(parents=True, exist_ok=True)
(out_dir / "assets").mkdir(exist_ok=True)
shutil.copy(root / "design" / "assets" / "logo-farnost-kurim.svg", out_dir / "assets")
vals = {
  "m1.day": "Zítra", "m1.date": "neděle 4. 10.", "m1.time": "8:00", "m1.place": "Kuřim",
  "m1.church": "kostel sv. Maří Magdalény", "cd.d": "0", "cd.dL": "dní", "cd.h": "19", "cd.hL": "hodin",
  "cd.m": "50", "cd.mL": "minut", "slideBg": "#DCEBF8", "slideNo": "1", "slideLabel": "Fotografie 1 / 7",
}
rest = [{"day": "Ne 4. 10.", "time": "9:30", "place": "Moravské Knínice"}, {"day": "Ne 4. 10.", "time": "11:00", "place": "Kuřim"}]
def dot(i): return {"label": f"Fotografie {i+1}", "current": "true" if i == 0 else "false", "w": "24px" if i == 0 else "8px", "bg": "#1D71B7" if i == 0 else "#C9D6E3"}
for f in src_dir.glob("*.dc.html"):
  s = f.read_text()
  s = re.sub(r'<script src="./support.js"></script>', '', s)
  s = re.sub(r'<script type="text/x-dc".*?</script>', '', s, flags=re.S)
  s = re.sub(r'</?(x-dc|helmet)>', '', s)
  s = re.sub(r'<sc-if[^>]*hint-placeholder-val="\{\{ false \}\}"[^>]*>.*?</sc-if>', '', s, flags=re.S)
  s = re.sub(r'</?sc-if[^>]*>', '', s)
  def expand(m):
    name, var, n, body = m.group(1), m.group(2), int(m.group(3)), m.group(4)
    items = [dot(i) for i in range(n)] if name == "dots" else rest[:n]
    out = []
    for it in items:
      b = body
      for k, v in it.items(): b = b.replace("{{%s.%s}}" % (var, k), v)
      out.append(b)
    return "".join(out)
  s = re.sub(r'<sc-for list="\{\{(\w+)\}\}" as="(\w+)" hint-placeholder-count="(\d+)">(.*?)</sc-for>', expand, s, flags=re.S)
  s = re.sub(r'\s(onClick|aria-current|aria-label)="\{\{[^}]*\}\}"', '', s)
  for k, v in vals.items(): s = s.replace("{{%s}}" % k, v)
  left = re.findall(r'\{\{[^}]*\}\}', s)
  (out_dir / "mockups" / f.name.replace(".dc.html", ".html")).write_text(s)
  print(f.name, "unresolved:", left)
