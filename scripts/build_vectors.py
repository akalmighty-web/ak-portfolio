"""
AK Portfolio - vector asset builder
Turns the raster brand assets into crisp SVGs used by the site.

  - assets/Title png.png        -> src/assets/svg/title.svg   (ANANTH + halo, traced)
  - assets/logo favicon.png     -> src/assets/svg/logo.svg    (A + halo, traced) + public/favicon.svg
  - procedural pixel background -> src/assets/svg/pixel-bg.svg (bottom-left / bottom-right groups for parallax)

Requirements:  pip install numpy scipy pillow potracer
Usage:         python scripts/build_vectors.py
"""
import random
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
import potrace

RED, YELLOW = (255, 3, 70), (255, 195, 0)
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "svg"
UPSCALE = 4  # trace at 4x so curves follow the anti-aliased edges


# ----------------------------------------------------------------- tracing
def color_mask(rgba, rgb, tol=70):
    d = np.abs(rgba[..., :3].astype(int) - np.array(rgb)).sum(axis=2)
    return (d < tol) & (rgba[..., 3] > 0)


def trace(mask, scale):
    """Binary mask -> SVG path data (coordinates divided by scale)."""
    path = potrace.Bitmap(~mask).trace(turdsize=8, alphamax=1.0, opticurve=True, opttolerance=0.4)
    f = lambda p: f"{p.x / scale:.1f} {p.y / scale:.1f}"
    parts = []
    for curve in path:
        parts.append(f"M{f(curve.start_point)}")
        for seg in curve.segments:
            if seg.is_corner:
                parts.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                parts.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        parts.append("Z")
    return "".join(parts)


def smooth_mask(mask, k):
    """Upscale a hard mask with a soft resample, then threshold -> smooth edges."""
    im = Image.fromarray((mask * 255).astype(np.uint8)).resize(
        (mask.shape[1] * k, mask.shape[0] * k), Image.BICUBIC)
    return nd.gaussian_filter(np.asarray(im).astype(np.float32), k * 0.35) > 127


def vectorize(src, dst, title):
    rgba = np.asarray(Image.open(src).convert("RGBA"))
    red, yel = color_mask(rgba, RED), color_mask(rgba, YELLOW)
    # extend red a little under the halo so no seam shows where yellow overlaps
    red_under = red | (yel & nd.binary_dilation(red, iterations=6))
    h, w = red.shape
    d_red = trace(smooth_mask(red_under, UPSCALE), UPSCALE)
    d_yel = trace(smooth_mask(yel, UPSCALE), UPSCALE)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">'
           f'<path class="ink" fill="#FF0346" fill-rule="evenodd" d="{d_red}"/>'
           f'<path class="halo" fill="#FFC300" fill-rule="evenodd" d="{d_yel}"/></svg>')
    dst.write_text(svg, encoding="utf-8")
    print(f"  {dst.relative_to(ROOT)}  {len(svg) // 1024} KB")
    return svg


# ------------------------------------------------------- pixel background
# Drawn on a U-px grid in a 1920x1200 viewBox, anchored to the bottom corners.
U = 12
W, H = 1920, 1200
GREYS = ["#f0f0f0", "#e5e5e5", "#d9d9d9", "#cdcdcd", "#c2c2c2", "#a8a8a8"]
rng = random.Random(7)


class Layer:
    def __init__(self):
        self.cells = {}  # (gx, gy) -> colour index

    def put(self, gx, gy, c):
        self.cells[(gx, gy)] = max(c, self.cells.get((gx, gy), -1))

    def svg(self):
        by = {}
        for (x, y), c in self.cells.items():
            by.setdefault(c, []).append((x, y))
        out = []
        for c, pts in sorted(by.items()):
            # merge horizontal runs into single rects to keep the file small
            pts.sort(key=lambda p: (p[1], p[0]))
            d, run = [], None
            for x, y in pts + [(None, None)]:
                if run and y == run[1] and x == run[0] + run[2]:
                    run[2] += 1
                    continue
                if run:
                    d.append(f"M{run[0] * U} {run[1] * U}h{run[2] * U}v{U}h-{run[2] * U}z")
                run = [x, y, 1] if x is not None else None
            out.append(f'<path fill="{GREYS[c] if isinstance(c, int) else c}" d="{"".join(d)}"/>')
        return "".join(out)


def blob(layer, cx, cy, rx, ry, shade, block=2, dither=True):
    """Cloud mass made of big blocks with a dithered, flecked rim."""
    gx0, gy0 = int(cx / U), int(cy / U)
    rxg, ryg = rx / U, ry / U
    for by in range(int(-ryg) - 2, int(ryg) + 3, block):
        for bx in range(int(-rxg) - 2, int(rxg) + 3, block):
            n = (bx / rxg) ** 2 + (by / ryg) ** 2 + rng.uniform(-0.18, 0.18)
            if n < 0.72:
                c = shade if n > 0.25 or rng.random() < 0.6 else shade + 1
                for dy in range(block):
                    for dx in range(block):
                        layer.put(gx0 + bx + dx, gy0 + by + dy, min(c, len(GREYS) - 1))
            elif dither and n < 1.05:
                for dy in range(block):
                    for dx in range(block):
                        if (gx0 + bx + dx + gy0 + by + dy) % 2 == 0 and rng.random() < 0.85:
                            layer.put(gx0 + bx + dx, gy0 + by + dy, max(shade - 2, 0))


def sparkle(layer, x, y, r, c=5):
    """4-point star: thick core, arms that thin out, faint diagonal glints on big ones."""
    gx, gy = int(x / U), int(y / U)
    for i in range(-r, r + 1):
        tip = abs(i) > r * 0.6
        layer.put(gx + i, gy, c - 1 if tip else c)
        layer.put(gx, gy + i, c - 1 if tip else c)
    if r >= 4:
        for dx, dy in [(1, 1), (-1, 1), (1, -1), (-1, -1)]:
            layer.put(gx + dx, gy + dy, c - 2)
        for dx, dy in [(2, 2), (-2, 2), (2, -2), (-2, -2)]:
            layer.put(gx + dx, gy + dy, c - 3)


def plus(layer, x, y, c=4):
    sparkle(layer, x, y, 1, c)


def hollow(layer, x, y, c=4):
    gx, gy = int(x / U), int(y / U)
    for dx in range(3):
        for dy in range(3):
            if (dx, dy) != (1, 1):
                layer.put(gx + dx, gy + dy, c)


def dot(layer, x, y, c=4):
    layer.put(int(x / U), int(y / U), c)


def moon(layer, cx, cy, r):
    gx0, gy0, rg = int(cx / U), int(cy / U), r / U
    for y in range(-int(rg) - 1, int(rg) + 2):
        for x in range(-int(rg) - 1, int(rg) + 2):
            d = (x * x + y * y) ** 0.5 / rg
            if d <= 1:
                light = (x + y) / (2 * rg)  # lit from the bottom-right edge
                c = 3 if light < 0.1 else 2
                if d > 0.82 and (x + y) % 2:
                    c = 1
                if rng.random() < 0.08:
                    c = 0
                layer.put(gx0 + x, gy0 + y, c)


def build_background():
    left, right = Layer(), Layer()
    # left cluster (bottom-left corner)
    for cx, cy, rx, ry, s, b in [(40, 860, 150, 200, 1, 2), (180, 990, 230, 150, 3, 2), (60, 1120, 220, 110, 2, 2),
                                 (420, 1120, 200, 110, 2, 2), (330, 960, 120, 90, 0, 2), (650, 1180, 220, 70, 1, 2),
                                 (250, 1180, 200, 60, 4, 2), (20, 700, 70, 90, 0, 2)]:
        blob(left, cx, cy, rx, ry, s, b)
    for x, y, r in [(220, 790, 6), (150, 690, 2), (500, 1140, 2)]:
        sparkle(left, x, y, r)
    for x, y in [(50, 640), (360, 840), (720, 1090), (30, 1090), (260, 980)]:
        plus(left, x, y)
    for x, y in [(470, 1010), (880, 1190)]:
        hollow(left, x, y)
    for x, y in [(90, 510), (40, 565), (290, 730), (440, 845), (420, 885), (555, 1075), (765, 1195), (805, 1150)]:
        dot(left, x, y)
    # right cluster (bottom-right corner)
    for cx, cy, rx, ry, s, b in [(1640, 1130, 230, 110, 3, 2), (1480, 1070, 120, 100, 1, 2), (1900, 980, 130, 230, 1, 2),
                                 (1820, 1150, 220, 90, 2, 2), (1420, 1180, 140, 50, 0, 2), (1560, 1020, 90, 60, 2, 2)]:
        blob(right, cx, cy, rx, ry, s, b)
    moon(right, 1765, 850, 92)
    for x, y, r in [(1630, 780, 2), (1640, 1010, 3), (1960, 855, 2)]:
        sparkle(right, x, y, r)
    for x, y in [(1280, 1135), (1365, 1145), (1535, 940), (1495, 965), (1935, 775), (1835, 1020)]:
        plus(right, x, y)
    for x, y in [(1800, 700), (1630, 900), (1210, 1200)]:
        hollow(right, x, y)
    for x, y in [(1885, 660), (1960, 745), (1665, 1050), (1400, 1025), (1320, 1205)]:
        dot(right, x, y)

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">'
           f'<g class="bg-left">{left.svg()}</g><g class="bg-right">{right.svg()}</g></svg>')
    dst = OUT / "pixel-bg.svg"
    dst.write_text(svg, encoding="utf-8")
    print(f"  {dst.relative_to(ROOT)}  {len(svg) // 1024} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    print("Tracing brand marks...")
    vectorize(ROOT / "assets" / "Title png.png", OUT / "title.svg", "Ananth")
    logo = vectorize(ROOT / "assets" / "logo favicon.png", OUT / "logo.svg", "AK logo")
    (ROOT / "public").mkdir(exist_ok=True)
    (ROOT / "public" / "favicon.svg").write_text(logo, encoding="utf-8")
    print("Generating pixel background...")
    build_background()
