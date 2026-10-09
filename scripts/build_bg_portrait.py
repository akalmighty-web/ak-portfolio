"""
AK Portfolio - portrait background
Makes the web copy of the phone (portrait) background.

  - assets/Website Background portrait.png -> src/assets/bg-portrait.webp

Requirements:  pip install pillow
Usage:         python scripts/build_bg_portrait.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "Website Background portrait.png"
DST = ROOT / "src" / "assets" / "bg-portrait.webp"

if __name__ == "__main__":
    im = Image.open(SRC).convert("RGBA")
    im.save(DST, "webp", quality=90, alpha_quality=100, method=6)
    print(f"  {DST.relative_to(ROOT)}  {im.width}x{im.height}  {DST.stat().st_size // 1024} KB")
