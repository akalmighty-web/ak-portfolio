"""Build the link-preview image and app icons into public/:

    og-image.jpg          1200x630 Open Graph / Twitter card (title + tagline left, Home pose right)
    apple-touch-icon.png  180x180 home-screen icon (iPhone / iPad)
    favicon-32.png        32x32 PNG fallback for browsers without SVG favicons

    python scripts/build_social.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
PAPER = (253, 253, 253)
RED = (255, 3, 70)
YELLOW = (255, 195, 0)
INK = (17, 17, 17)


def trimmed(path):
    im = Image.open(path).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


def og_image():
    W, H = 1200, 630
    card = Image.new("RGBA", (W, H), PAPER + (255,))
    # the character, as on Home (4K still), bottom right
    char = trimmed(ROOT / "public" / "frames" / "stills" / "home.webp")
    s = 590 / char.height
    char = char.resize((round(char.width * s), 590), Image.LANCZOS)
    card.alpha_composite(char, (W - char.width - 10, H - char.height))
    # the ANANTH title with its halo
    title = trimmed(ROOT / "assets" / "Title png.png")
    s = 560 / title.width
    title = title.resize((560, round(title.height * s)), Image.LANCZOS)
    card.alpha_composite(title, (56, 120))
    # tagline in the site's marker font
    d = ImageDraw.Draw(card)
    hand = ROOT / "Fonts" / "TrashHand.TTF"
    y = 120 + title.height + 34
    d.text((70, y), "MULTI DISCIPLINARY DESIGNER", font=ImageFont.truetype(str(hand), 38), fill=INK)
    d.text((78, y + 46), "CONCEPT ARTIST", font=ImageFont.truetype(str(hand), 66), fill=INK)
    d.rounded_rectangle((80, y + 128, 380, y + 136), radius=4, fill=YELLOW)
    card.convert("RGB").save(PUBLIC / "og-image.jpg", quality=88, optimize=True, progressive=True)


def icons():
    logo = trimmed(ROOT / "assets" / "logo favicon.png")
    for size, pad, name in ((180, 22, "apple-touch-icon.png"), (32, 2, "favicon-32.png")):
        icon = Image.new("RGBA", (size, size), PAPER + (255,) if size == 180 else (0, 0, 0, 0))
        s = (size - 2 * pad) / max(logo.size)
        l = logo.resize((round(logo.width * s), round(logo.height * s)), Image.LANCZOS)
        icon.alpha_composite(l, ((size - l.width) // 2, (size - l.height) // 2))
        icon.save(PUBLIC / name, optimize=True)


if __name__ == "__main__":
    og_image()
    icons()
    print("wrote og-image.jpg, apple-touch-icon.png, favicon-32.png")
