"""Build the Fuuta brand assets: SVG sources in design/, PNG icons and favicon in app/icons/.

Usage: uv run tools/make_brand.py

Outputs
  design/icon-app.svg    Home Screen icon: hat + FUUTA wordmark on olive
  design/icon-maskable.svg  Android maskable icon (art inside the safe zone)
  design/icon-site.svg   Website/tab icon: hat only on olive
  design/logo.svg        Logo for README and app header: hat + wordmark + tagline on cream
  app/icons/*            PNG sizes, maskable icons, favicon, logo

Text is converted to paths (macOS Georgia Bold / Helvetica Bold), so the SVGs need no fonts.
Rasterising uses headless Chrome (set CHROME to override its path).
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTCollection, TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DESIGN, ICONS = ROOT / "design", ROOT / "app" / "icons"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
HELVETICA = "/System/Library/Fonts/Helvetica.ttc"

OLIVE, OLIVE_D, CREAM, GOLD, GOLD_D = "#6a7f44", "#4d5f30", "#f3ece0", "#d3a53b", "#8a6a1c"
BROWN = dict(c1="#7b4d2a", c2="#9d6c40", c3="#6a3f22", rim="#5f3a20", seam="#4e2e18", cap="#a4552e")


def text_path(font: TTFont, text: str, size: float, spacing: float, cx: float, baseline: float) -> str:
    gs, cmap, sc = font.getGlyphSet(), font.getBestCmap(), size / font["head"].unitsPerEm
    names = [cmap[ord(c)] for c in text]
    adv = [gs[n].width * sc for n in names]
    x = cx - (sum(adv) + spacing * (len(text) - 1)) / 2
    d = ""
    for n, a in zip(names, adv):
        pen = SVGPathPen(gs)
        gs[n].draw(TransformPen(pen, (sc, 0, 0, -sc, x, baseline)))
        d += pen.getCommands()
        x += a + spacing
    return d


def hat(shadow: float) -> str:
    T = BROWN
    return f'''<g>
<ellipse cx="512" cy="744" rx="390" ry="28" fill="#000" opacity="{shadow}" filter="url(#blur)"/>
<ellipse cx="512" cy="624" rx="412" ry="108" fill="{T['rim']}"/>
<ellipse cx="512" cy="606" rx="390" ry="94" fill="url(#weave)"/>
<g fill="none" stroke="#9c6e38" stroke-width="3" opacity=".5"><ellipse cx="512" cy="606" rx="362" ry="86"/><ellipse cx="512" cy="606" rx="326" ry="77"/><ellipse cx="512" cy="606" rx="290" ry="68"/><ellipse cx="512" cy="606" rx="254" ry="59"/></g>
<ellipse cx="512" cy="606" rx="344" ry="82" fill="none" stroke="{CREAM}" stroke-width="3" stroke-dasharray="2 11" stroke-linecap="round" opacity=".85"/>
<path d="M282 500L466 238H558L742 500A230 60 0 0 1 282 500Z" fill="url(#cone)"/>
<g fill="none" stroke="{T['seam']}" stroke-width="3.5" opacity=".55"><path d="M498 242L474 552"/><path d="M526 242L550 552"/><path d="M476 240L338 500" opacity=".45"/><path d="M548 240L686 500" opacity=".45"/></g>
<path d="M282 500A230 60 0 0 0 742 500" fill="none" stroke="{T['seam']}" stroke-width="5" opacity=".5"/>
<g transform="translate(286 512) rotate(45)"><rect x="-24" y="-24" width="48" height="48" rx="5" fill="{CREAM}"/><rect x="-14" y="-14" width="28" height="28" fill="{OLIVE}"/><rect x="-6" y="-6" width="12" height="12" fill="{GOLD}"/></g>
<g transform="translate(738 512) rotate(45)"><rect x="-24" y="-24" width="48" height="48" rx="5" fill="{CREAM}"/><rect x="-14" y="-14" width="28" height="28" fill="{OLIVE}"/><rect x="-6" y="-6" width="12" height="12" fill="{GOLD}"/></g>
<clipPath id="bead"><circle cx="512" cy="632" r="34"/></clipPath>
<circle cx="512" cy="632" r="38" fill="{T['rim']}"/>
<g clip-path="url(#bead)"><rect x="470" y="590" width="84" height="84" fill="{CREAM}"/><g transform="rotate(-35 512 632)"><rect x="470" y="618" width="84" height="11" fill="{T['seam']}"/><rect x="470" y="637" width="84" height="11" fill="{GOLD}"/><rect x="470" y="656" width="84" height="11" fill="{OLIVE}"/></g></g>
<ellipse cx="512" cy="204" rx="50" ry="40" fill="{T['cap']}"/>
<path d="M512 168a50 40 0 0 1 50 34H462a50 40 0 0 1 50-34Z" fill="#fff" opacity=".13"/>
<rect x="462" y="226" width="100" height="44" fill="{CREAM}"/><rect x="462" y="239" width="100" height="14" fill="#2f2a22"/>
<ellipse cx="512" cy="226" rx="56" ry="10" fill="none" stroke="{GOLD}" stroke-width="8" stroke-dasharray="8 5"/>
<ellipse cx="512" cy="272" rx="60" ry="11" fill="none" stroke="{GOLD}" stroke-width="8" stroke-dasharray="8 5"/>
</g>'''


DEFS = f'''<defs><filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
<linearGradient id="cone" x1="0" x2="1"><stop offset="0" stop-color="{BROWN['c1']}"/><stop offset=".5" stop-color="{BROWN['c2']}"/><stop offset="1" stop-color="{BROWN['c3']}"/></linearGradient>
<linearGradient id="weave" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#dcaa6c"/><stop offset=".6" stop-color="#d3a063"/><stop offset="1" stop-color="#c08c52"/></linearGradient>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#76894e"/><stop offset="1" stop-color="#5a6c37"/></radialGradient></defs>'''
OLIVE_BG = '<rect width="1024" height="1024" fill="url(#bg)"/>'


def svg(body: str, rx: int = 0) -> str:
    clip = f'<clipPath id="r"><rect width="1024" height="1024" rx="{rx}"/></clipPath><g clip-path="url(#r)">' if rx else "<g>"
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{DEFS}{clip}{body}</g></svg>\n'


def build_svgs() -> None:
    georgia = TTFont(GEORGIA)
    helv = TTCollection(HELVETICA).fonts[1]  # Helvetica Bold
    # Home Screen icon: hat + wordmark, no small text
    word = text_path(georgia, "FUUTA", 214, 6, 512, 860)
    inner = f'<g transform="translate(72 22) scale(.86)">{hat(.22)}</g><path d="{word}" fill="{CREAM}"/>'
    (DESIGN / "icon-app.svg").write_text(svg(OLIVE_BG + inner))
    # Maskable (Android): same art shrunk into the central safe zone on the same background
    (DESIGN / "icon-maskable.svg").write_text(svg(f'{OLIVE_BG}<g transform="translate(133 133) scale(.74)">{inner}</g>'))
    # Website icon: hat only (rounded corners in the SVG favicon, full-bleed square for PNGs)
    site = f'{OLIVE_BG}<g transform="translate(-20 52) scale(1.04)">{hat(.22)}</g>'
    (DESIGN / "icon-site.svg").write_text(svg(site))
    (DESIGN / "favicon.svg").write_text(svg(site, rx=200))
    # Logo: cream, hat + wordmark + tagline
    word = text_path(georgia, "FUUTA", 206, 6, 512, 808)
    tag = text_path(helv, "LEARN MAURITANIAN PULAAR", 34, 9, 512, 880)
    logo = (f'<rect width="1024" height="1024" fill="{CREAM}"/><g transform="translate(112 -4) scale(.78)">{hat(.14)}</g>'
            f'<path d="{word}" fill="{OLIVE_D}"/><path d="{tag}" fill="{GOLD_D}"/>'
            f'<g fill="{GOLD_D}"><rect x="330" y="936" width="130" height="5" rx="2.5"/><rect x="564" y="936" width="130" height="5" rx="2.5"/><path d="M512 920l20 20-20 20-20-20z"/></g>')
    (DESIGN / "logo.svg").write_text(svg(logo))


def rasterise(svg_path: Path, out: Path, size: int = 1024) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "p.html"
        page.write_text(f'<!doctype html><style>html,body{{margin:0}}img{{display:block;width:{size}px;height:{size}px}}</style><img src="file://{svg_path}">')
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                        f"--window-size={size},{size}", "--force-device-scale-factor=1", f"--screenshot={out}", f"file://{page}"],
                       check=True, capture_output=True)


def main() -> int:
    DESIGN.mkdir(exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)
    build_svgs()
    with tempfile.TemporaryDirectory() as tmp:
        app_png, site_png = Path(tmp) / "app.png", Path(tmp) / "site.png"
        rasterise(DESIGN / "icon-app.svg", app_png)
        rasterise(DESIGN / "icon-site.svg", site_png)
        app, site = Image.open(app_png).convert("RGB"), Image.open(site_png).convert("RGB")
        app.save(DESIGN / "icon-app-1024.png", optimize=True)
        for name, s in (("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)):
            app.resize((s, s), Image.LANCZOS).save(ICONS / name, optimize=True)
        mask_png = Path(tmp) / "mask.png"
        rasterise(DESIGN / "icon-maskable.svg", mask_png)
        mask = Image.open(mask_png).convert("RGB")
        for name, sz in (("icon-maskable-512.png", 512), ("icon-maskable-192.png", 192)):
            mask.resize((sz, sz), Image.LANCZOS).save(ICONS / name, optimize=True)
        site.resize((32, 32), Image.LANCZOS).save(ICONS / "favicon-32.png", optimize=True)
    shutil.copy(DESIGN / "favicon.svg", ICONS / "favicon.svg")
    shutil.copy(DESIGN / "logo.svg", ICONS / "logo.svg")
    print("wrote design/*.svg and", ", ".join(sorted(p.name for p in ICONS.iterdir())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
