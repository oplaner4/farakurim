"""Builds src/fonts/farnost-sans-*.woff2 from the Oxygen TTFs (Google Fonts download).

Farnost Sans is Oxygen with two fixes for Czech and Slovak:
- the caron letters (ť ď ľ Ľ) draw their apostrophe caron past the advance width, so it covers the next space
  ("pouť na" reads "pouťna"); their advance widths are widened to fit the caron;
- Oxygen Bold has no ď ľ Ľ; they are composed from the base letter and the comma, like Bold ť.
The OFL forbids the Reserved Font Name "Oxygen" on a modified version, so the fonts are renamed.

One file per weight covers Google's "latin" + "latin-ext" ranges, i.e. all Czech letters.
Requires fonttools + brotli: pip install --user fonttools brotli
Usage: python3 scripts/build-fonts.py [dir-with-Oxygen-*.ttf]  (default: fonts-source/Oxygen)
"""

import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fonts-source" / "Oxygen"
OUT = ROOT / "src" / "fonts"

FAMILY = "Farnost Sans"
PS_FAMILY = "FarnostSans"
NOTICE = "Modified 2026 for farakurim.cz: renamed, caron letters (ť ď ľ Ľ) widened, Bold ď ľ Ľ added."
WEIGHTS = [("Light", 300), ("Regular", 400), ("Bold", 700)]

LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"

# Caron letter -> (base glyph, code point).
CARONS = {"tcaron": ("t", 0x165), "dcaron": ("d", 0x10F), "lcaron": ("l", 0x13E), "Lcaron": ("L", 0x13D)}
# Space between the caron's ink and the next glyph, in font units (2048 per em).
CARON_RSB = 60


def parse_unicodes(ranges):
    codes = []
    for part in ranges.split(","):
        start, _, end = part.removeprefix("U+").partition("-")
        codes.extend(range(int(start, 16), int(end or start, 16) + 1))
    return codes


def bounds(font, name):
    glyph = font["glyf"][name]
    glyph.recalcBounds(font["glyf"])
    return glyph


def add_bold_carons(bold, regular):
    """Composes the caron letters Oxygen Bold lacks, placing the comma as Regular does, adjusted by Bold ť."""
    glyf, hmtx = bold["glyf"], bold["hmtx"]

    def comma_offset(font, name):
        comp = next(c for c in font["glyf"][name].components if c.glyphName == "comma")
        return comp.x, comp.y

    # How far Bold moves the comma of ť compared with Regular, relative to the base letter's ink.
    bold_tx, bold_ty = comma_offset(bold, "tcaron")
    reg_tx, reg_ty = comma_offset(regular, "tcaron")
    dx = (bold_tx - bounds(bold, "t").xMax) - (reg_tx - bounds(regular, "t").xMax)
    dy = (bold_ty - bounds(bold, "t").yMax) - (reg_ty - bounds(regular, "t").yMax)

    order = bold.getGlyphOrder()
    for name, (base, code) in CARONS.items():
        if name in glyf:
            continue
        reg_x, reg_y = comma_offset(regular, name)
        x = round(bounds(bold, base).xMax + (reg_x - bounds(regular, base).xMax) + dx)
        y = round(bounds(bold, base).yMax + (reg_y - bounds(regular, base).yMax) + dy)
        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = []
        for comp_name, cx, cy in ((base, 0, 0), ("comma", x, y)):
            comp = GlyphComponent()
            comp.glyphName, comp.x, comp.y, comp.flags = comp_name, cx, cy, 0
            glyph.components.append(comp)
        order.append(name)
        glyf.glyphs[name] = glyph
        hmtx[name] = hmtx[base]
        for table in bold["cmap"].tables:
            if table.isUnicode():
                table.cmap[code] = name
        if "GDEF" in bold and bold["GDEF"].table.GlyphClassDef:
            bold["GDEF"].table.GlyphClassDef.classDefs[name] = 1  # base glyph
    bold.setGlyphOrder(order)
    glyf.glyphOrder = order


def widen_carons(font):
    hmtx = font["hmtx"]
    for name in CARONS:
        glyph = bounds(font, name)
        advance, lsb = hmtx[name]
        hmtx[name] = (max(advance, glyph.xMax + CARON_RSB), lsb)
        if glyph.isComposite():
            # USE_MY_METRICS would reset the advance to the base letter's on layout.
            for comp in glyph.components:
                comp.flags &= ~0x0200


def rename(font, style, weight):
    full = f"{FAMILY} {style}"
    ps = f"{PS_FAMILY}-{style}"
    name = font["name"]
    copyright_ = name.getDebugName(0)
    version = name.getDebugName(5)
    # Legacy (ID 1/2) family groups only Regular/Bold; Light is its own legacy family, as in Oxygen.
    legacy_family = FAMILY if style in ("Regular", "Bold") else full
    legacy_style = style if style in ("Regular", "Bold") else "Regular"
    for name_id in (0, 1, 2, 3, 4, 5, 6, 16, 17):
        name.removeNames(nameID=name_id)
    entries = {
        0: f"{copyright_.rstrip('.')}. {NOTICE}",
        1: legacy_family,
        2: legacy_style,
        3: f"{font['head'].fontRevision:.3f};farakurim.cz;{ps}",
        4: full,
        5: f"{version}; {NOTICE}",
        6: ps,
    }
    if legacy_family != FAMILY:
        entries |= {16: FAMILY, 17: style}
    for name_id, value in entries.items():
        name.setName(value, name_id, 3, 1, 0x409)
    font["OS/2"].usWeightClass = weight


def main():
    regular = TTFont(SRC / "Oxygen-Regular.ttf")
    options = Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    unicodes = parse_unicodes(f"{LATIN},{LATIN_EXT}")
    for style, weight in WEIGHTS:
        font = TTFont(SRC / f"Oxygen-{style}.ttf")
        if style == "Bold":
            add_bold_carons(font, regular)
        widen_carons(font)
        rename(font, style, weight)
        subsetter = Subsetter(options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        font.flavor = "woff2"
        out = OUT / f"farnost-sans-{weight}.woff2"
        font.save(out)
        print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
