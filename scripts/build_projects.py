"""
AK Portfolio - project builder
Reads the Projects/ folder and produces web-ready media + the data the site uses.

  Projects/<Category folder>/<Project folder>/
      thumbnail.png        -> cartridge screen image (padding trimmed)
      everything else      -> the project view, top to bottom
                              (natural filename order unless scripts/projects.config.json says otherwise)

  - Category comes from the category folder name, project name from the project folder name.
    A leading number like "01 " sets the order and is hidden from the displayed name.
  - Images -> WebP at a few widths for srcset. Animated GIFs -> looping MP4 (much smaller) + poster.
  - A project without a thumbnail is skipped (with a warning), so a category can stay "Coming soon".
  - Originals are never modified. Unchanged files are not re-encoded on the next run.

Outputs:  public/projects/<slug>/...   and   src/data/projects.generated.json
Requires: ffmpeg on PATH, pip install pillow numpy
Usage:    python scripts/build_projects.py
"""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Projects"
OUT = ROOT / "public" / "projects"
DATA = ROOT / "src" / "data" / "projects.generated.json"
CONFIG = json.loads((ROOT / "scripts" / "projects.config.json").read_text(encoding="utf-8"))

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v"}
WIDTHS = [960, 1600, 2400]  # srcset widths (never upscaled)
THUMB_WIDTHS = [640, 1200]
VIDEO_MAX_W = 1920
WEBP_Q = 82


def natural_key(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def split_number(name):
    """'01 Neon Alley' -> (1, 'Neon Alley'); 'Neon Alley' -> (None, 'Neon Alley')."""
    m = re.match(r"^\s*(\d+)[\s._-]+(.*)$", name)
    number, rest = (int(m.group(1)), m.group(2)) if m else (None, name)
    return number, re.sub(r"\s+", " ", rest).strip()


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def category_of(folder):
    for keyword, cat in CONFIG["categories"].items():
        if keyword in folder.lower():
            return cat
    return None


def fresh(out, src):
    return out.exists() and out.stat().st_mtime >= src.stat().st_mtime


def save_webp_set(img, src, dest_dir, stem, widths):
    """Write stem-<w>.webp for each width up to the source width; return [(w, h, rel_path)]."""
    out = []
    targets = [w for w in widths if w < img.width] + [min(img.width, widths[-1])]
    for w in sorted(set(targets)):
        h = round(img.height * w / img.width)
        path = dest_dir / f"{stem}-{w}.webp"
        if not fresh(path, src):
            im = img if w == img.width else img.resize((w, h), Image.LANCZOS)
            im.save(path, "WEBP", quality=WEBP_Q, method=6)
        out.append((w, h, path))
    return out


def trim_padding(img):
    """Thumbnails are wide art centred in a square: crop the transparent / black padding."""
    rgba = np.asarray(img.convert("RGBA"))
    solid = (rgba[..., 3] > 16) & (rgba[..., :3].max(axis=2) > 12)
    ys, xs = np.where(solid)
    if not len(ys):
        return img
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def save_share_image(img, src, dest_dir):
    """og.jpg: the thumbnail on a 1200x630 card, for link previews (JPEG works everywhere)."""
    path = dest_dir / "og.jpg"
    if not fresh(path, src):
        W, H = 1200, 630
        card = Image.new("RGB", (W, H), (253, 253, 253))
        art = img.convert("RGBA")
        s = max(W / art.width, H / art.height)  # cover the card
        art = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
        art = art.crop(((art.width - W) // 2, (art.height - H) // 2, (art.width - W) // 2 + W, (art.height - H) // 2 + H))
        card.paste(art, (0, 0), art)
        card.save(path, "JPEG", quality=85, optimize=True, progressive=True)
    return path


def is_animated(path):
    try:
        return getattr(Image.open(path), "n_frames", 1) > 1
    except Exception:
        return False


def gif_to_video(src, dest_dir, stem):
    mp4 = dest_dir / f"{stem}.mp4"
    poster = dest_dir / f"{stem}-poster.webp"
    if not fresh(mp4, src):
        vf = f"scale='min({VIDEO_MAX_W},iw)':-2:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", vf, "-c:v", "libx264", "-preset", "slow",
                        "-crf", "25", "-movflags", "+faststart", "-an", str(mp4)], check=True)
    im = Image.open(src)
    w, h = im.size
    if w > VIDEO_MAX_W:
        w, h = VIDEO_MAX_W, round(h * VIDEO_MAX_W / w)
    if not fresh(poster, src):
        im.seek(0)
        im.convert("RGB").resize((w, h), Image.LANCZOS).save(poster, "WEBP", quality=70, method=6)
    return mp4, poster, w, h


def video_copy(src, dest_dir, stem):
    mp4 = dest_dir / f"{stem}.mp4"
    if not fresh(mp4, src):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"scale='min({VIDEO_MAX_W},iw)':-2,format=yuv420p",
                        "-c:v", "libx264", "-crf", "22", "-preset", "slow", "-movflags", "+faststart", "-c:a", "aac", str(mp4)], check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                            "-of", "csv=p=0", str(mp4)], capture_output=True, text=True, check=True).stdout.strip().split(",")
    return mp4, int(probe[0]), int(probe[1])


def url(path):
    return "/" + path.relative_to(ROOT / "public").as_posix()


def build_project(folder, category):
    number, name = split_number(folder.name)
    slug = slugify(name)
    cfg = CONFIG["projects"].get(folder.name, {})
    files = {f.name: f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXT | VIDEO_EXT}
    thumb_src = next((f for n, f in files.items() if Path(n).stem.lower() == "thumbnail"), None)
    if not thumb_src:
        print(f"  ! skipped '{folder.name}': no thumbnail")
        return None

    dest = OUT / slug
    dest.mkdir(parents=True, exist_ok=True)

    # cartridge thumbnail
    thumb_img = trim_padding(Image.open(thumb_src))
    thumb = save_webp_set(thumb_img, thumb_src, dest, "thumbnail", THUMB_WIDTHS)
    og = save_share_image(thumb_img, thumb_src, dest)

    # content order: config order first, then anything else (natural sort); covers only when listed
    skip = {s.lower() for s in cfg.get("skip", [])} | {thumb_src.name.lower()}
    listed = cfg.get("order", [])
    listed_names = {e.lower() for e in listed if isinstance(e, str)}
    rest = sorted((n for n in files if n.lower() not in listed_names and n.lower() not in skip
                   and not Path(n).stem.lower() == "cover"), key=natural_key)
    if listed and rest:
        print(f"  ! '{folder.name}': not in configured order, added at the end: {', '.join(rest)}")
    entries = [e for e in listed if not isinstance(e, str) or e.lower() not in skip] + rest

    media = []
    for i, entry in enumerate(entries, 1):
        if isinstance(entry, dict) and "youtube" in entry:
            media.append({"type": "youtube", "id": entry["youtube"], "width": 16, "height": 9})
            continue
        src = next((f for n, f in files.items() if n.lower() == entry.lower()), None)
        if not src:
            print(f"  ! '{folder.name}': configured file not found: {entry}")
            continue
        stem = f"{i:02d}-{slugify(src.stem) or 'media'}"
        ext = src.suffix.lower()
        if ext == ".gif" and is_animated(src):
            # animated GIF -> silent looping video, plays like the GIF
            mp4, poster, w, h = gif_to_video(src, dest, stem)
            media.append({"type": "video", "src": url(mp4), "poster": url(poster), "width": w, "height": h, "loop": True})
        elif ext in VIDEO_EXT:
            # a real video: shown with controls
            mp4, w, h = video_copy(src, dest, stem)
            media.append({"type": "video", "src": url(mp4), "poster": None, "width": w, "height": h, "loop": False})
        else:
            img = Image.open(src)
            alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
            img = img.convert("RGBA" if alpha else "RGB")
            sizes = save_webp_set(img, src, dest, stem, WIDTHS)
            w, h, _ = sizes[-1]
            media.append({"type": "image", "src": url(sizes[-1][2]), "srcset": ", ".join(f"{url(p)} {sw}w" for sw, _, p in sizes),
                          "width": w, "height": h})
        print(f"    {entry} -> {media[-1]['type']}")

    return {
        "slug": slug,
        "title": name,
        "category": category,
        "number": number,
        "folder": folder.name,
        "behance": cfg.get("behance"),
        "description": cfg.get("description"),
        "thumbnail": {"src": url(thumb[-1][2]), "srcset": ", ".join(f"{url(p)} {w}w" for w, _, p in thumb)},
        "og": url(og),
        "media": media,
    }


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found - install it and add it to PATH first.")
    OUT.mkdir(parents=True, exist_ok=True)
    projects = []
    for cat_dir in sorted(p for p in SRC.iterdir() if p.is_dir()):
        category = category_of(cat_dir.name)
        if not category:
            print(f"! unknown category folder '{cat_dir.name}' (add a keyword to projects.config.json)")
            continue
        order = CONFIG["projectOrder"].get(category, [])
        rank = lambda d: (order.index(d.name) if d.name in order else len(order),
                          split_number(d.name)[0] if split_number(d.name)[0] is not None else 1e9, natural_key(d.name))
        for folder in sorted((p for p in cat_dir.iterdir() if p.is_dir()), key=rank):
            print(f"[{category}] {folder.name}")
            p = build_project(folder, category)
            if p:
                projects.append(p)
    DATA.write_text(json.dumps({"projects": projects}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n{len(projects)} projects -> {DATA.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
