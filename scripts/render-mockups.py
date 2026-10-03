# Renders the design-tool mockups (design/mockups/<page>/<light|dark>/*.dc.html) to static HTML for visual comparison.
# Usage: python3 scripts/render-mockups.py [out-dir]  (default: .design-preview, served by `pnpm mockups`)
# Output: <out-dir>/mockups/<page>/<light|dark>/<name>.html
#
# Each mockup's `renderVals()` (its script block) runs in Node with the initial state, then the
# `{{holes}}`, <sc-for> and <sc-if> are filled from the result. Time-dependent homepage values are pinned
# to the build data on Saturday 3. 10. 2026 (next mass: Sunday 8:00).
import json
import pathlib
import re
import shutil
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parent.parent
src_dir = root / "design" / "mockups"
out_dir = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / ".design-preview"
(out_dir / "assets").mkdir(parents=True, exist_ok=True)
shutil.copy(root / "design" / "assets" / "logo-farnost-kurim.svg", out_dir / "assets")

home_fixed = {
  "m1": {"day": "Zítra", "date": "neděle 4. 10.", "time": "8:00", "place": "Kuřim", "church": "kostel sv. Maří Magdalény"},
  "cd": {"d": "0", "dL": "dní", "h": "19", "hL": "hodin", "m": "50", "mL": "minut"},
  "rest": [{"day": "Ne 4. 10.", "time": "9:30", "place": "Moravské Knínice"}, {"day": "Ne 4. 10.", "time": "11:00", "place": "Kuřim"}],
}
# Light and dark homepage mockups differ only in colours.
home_theme = {"light": {"slideBg": "#DCEBF8", "dotOn": "#1D71B7", "dotOff": "#C9D6E3"},
              "dark": {"slideBg": "#1C3350", "dotOn": "#7DB8EE", "dotOff": "#5A6B82"}}

NODE = """
const src = require('fs').readFileSync(0, 'utf8');
class DCLogic { constructor(props) { this.props = props; this.state = null; } setState() {} forceUpdate() {} }
const Component = new Function('DCLogic', src + '; return Component;')(DCLogic);
const strip = (v) => typeof v === 'function' ? undefined : Array.isArray(v) ? v.map(strip)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, strip(x)])) : v;
process.stdout.write(JSON.stringify(strip(new Component(JSON.parse(process.argv[1])).renderVals())));
"""


def render_vals(script, props):
  return json.loads(subprocess.run(["node", "-e", NODE, json.dumps(props)], input=script, capture_output=True,
                                   text=True, check=True).stdout)


def lookup(ctx, path):
  v = ctx
  for k in path.strip().split("."):
    if not isinstance(v, dict) or k not in v:
      return None
    v = v[k]
  return v


def fill(s, ctx):
  out = []
  pos = 0
  for m in re.finditer(r"<sc-(for|if)\b([^>]*)>", s):
    if m.start() < pos:
      continue
    # Find the matching closing tag (blocks of the same kind may nest).
    tag, depth, i = m.group(1), 1, m.end()
    for t in re.finditer(r"<(/?)sc-%s\b[^>]*>" % tag, s[m.end():]):
      depth += -1 if t.group(1) else 1
      if depth == 0:
        i = m.end() + t.start()
        end = m.end() + t.end()
        break
    out.append(s[pos:m.start()])
    body, attrs = s[m.end():i], m.group(2)
    if tag == "for":
      var = re.search(r'as="(\w+)"', attrs).group(1)
      items = lookup(ctx, re.search(r'list="\{\{(.*?)\}\}"', attrs).group(1)) or []
      out.extend(fill(body, {**ctx, var: it}) for it in items)
    else:
      value = lookup(ctx, re.search(r'value="\{\{(.*?)\}\}"', attrs).group(1))
      if value is None:
        value = "true" in re.search(r'hint-placeholder-val="\{\{(.*?)\}\}"', attrs).group(1)
      if value:
        out.append(fill(body, ctx))
    pos = end
  out.append(s[pos:])
  return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", lambda h: "" if (v := lookup(ctx, h.group(1))) is None else str(v), "".join(out))


for f in sorted(src_dir.glob("*/*/*.dc.html")):
  page, theme = f.parent.parent.name, f.parent.name
  s = f.read_text()
  script = re.search(r'<script type="text/x-dc".*?>(.*?)</script>', s, flags=re.S).group(1)
  props = {k: v["default"] for k, v in json.loads(re.search(r"data-props='(.*?)'", s).group(1)).items() if "default" in v}
  ctx = render_vals(script, props)
  if page == "home":
    t = home_theme[theme]
    ctx.update(home_fixed, slideBg=t["slideBg"], dots=[
      {"label": f"Fotografie {i + 1}", "current": "true" if i == 0 else "false", "w": "24px" if i == 0 else "8px",
       "bg": t["dotOn"] if i == 0 else t["dotOff"]} for i in range(7)])
  s = re.sub(r'<script src="./support.js"></script>', "", s)
  s = re.sub(r'<script type="text/x-dc".*?</script>', "", s, flags=re.S)
  s = re.sub(r"</?(x-dc|helmet)>", "", s)
  s = re.sub(r'\s(onClick|aria-current|aria-label)="\{\{[^}]*\}\}"', "", s)
  s = fill(s, ctx)
  target = out_dir / "mockups" / page / theme / f.name.replace(".dc.html", ".html")
  target.parent.mkdir(parents=True, exist_ok=True)
  target.write_text(s)
  print(f.relative_to(src_dir), "unresolved:", re.findall(r"\{\{[^}]*\}\}", s))
