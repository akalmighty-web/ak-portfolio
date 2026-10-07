"""Prepare the About page's "Worked with / Awards" band images.

Reads the logos in  assets/worked with/  and the laurels in  assets/Awards/
(the originals are never touched), trims the empty space around each one,
scales it to a fixed height and writes a transparent WebP to src/assets/band/.
A logo drawn on a solid dark background (no transparency) is keyed out: its
bright pixels become the logo, the background becomes transparent.

Every image is baked to clean white: only the light parts of a logo are kept
(dark drop shadows, glitch fringes and dark details become transparent), so no
CSS filter is needed and nothing turns into a white blob. The site shows them in
the order and with the names listed in BAND in src/config.js. After adding a
file here, run this script and add an entry there.

    python scripts/build_band.py
"""
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {ROOT / "assets" / "worked with": 128, ROOT / "assets" / "Awards": 220}  # output height (px)
OUT = ROOT / "src" / "assets" / "band"


def slug(name: str) -> str:
    """File name → output name (same rule as slug() in src/components/AboutBand.jsx)."""
    return re.sub(r"[^a-z0-9]+", "-", Path(name).stem.lower()).strip("-")


def prepare(path: Path, height: int) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    alpha = im.getchannel("A")
    opaque = sum(alpha.histogram()[201:]) / (im.width * im.height)
    if opaque > 0.9:  # (almost) fully opaque: a logo on a dark plate
        grey = im.convert("L")
        # only the bright core counts (drops coloured glitch fringes around the letters)
        alpha = grey.point(lambda v: 0 if v < 120 else min(255, int((v - 120) * 255 / 70)))
        im.putalpha(alpha)
    # bake to white: alpha × lightness (white stays, shadows and dark details drop out)
    light = im.convert("L").point(lambda v: 0 if v < 110 else min(255, int((v - 110) * 255 / 100)))
    alpha = ImageChops.multiply(im.getchannel("A"), light)
    im = Image.merge("RGBA", (*Image.new("RGB", im.size, "white").split(), alpha))
    # trim to the logo; stray specks (a few px) don't count
    box = alpha.point(lambda v: 255 if v > 8 else 0).filter(ImageFilter.MinFilter(7)).getbbox()
    box = (max(box[0] - 3, 0), max(box[1] - 3, 0), min(box[2] + 3, im.width), min(box[3] + 3, im.height))
    im = im.crop(box)
    w = round(im.width * height / im.height)
    return im.resize((w, height), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for folder, height in SOURCES.items():
        for f in sorted(folder.glob("*.png")):
            out = OUT / f"{slug(f.name)}.webp"
            prepare(f, height).save(out, "WEBP", quality=90, method=6)
            print(f"{f.relative_to(ROOT)} -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
