"""
AK Portfolio - frame processor
Turns the white-background scroll animation into web-ready frame sequences.

  - Intro frames (black bars + eye reveal) -> opaque WebP (no cut-out needed)
  - Site frames (Home freeze onward)       -> transparent WebP (white removed)
  - 3 sizes: 1280 / 1920 / 2560 wide, plus 4K transparent stills of the 4 freeze frames
  - --portrait: the 9:16 phone version (2160x3840 video) -> public/frames-portrait/,
    3 sizes 720 / 1080 / 1440 wide, stills 2160 wide, frames 0..327

Cut-out method: removes only the white CONNECTED TO THE FRAME EDGE, so eye whites
and hair shine inside the character are kept. Same rule on every frame = no flicker.

Requirements:  ffmpeg on PATH,  pip install numpy scipy pillow
Usage:         python process_frames.py "Animations/full_scrollable_website_animation.mp4"
               python process_frames.py "Animations/full_scrollable_website_animation_portrait.mp4" --portrait
               add --stills-only to regenerate just the 4K freeze stills
"""
import subprocess, sys, shutil, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd

# ---------- settings (change timings here if the video changes) ----------
FPS = 30
INTRO_END = 120          # frames 0..119 = intro (opaque). 120 = Home freeze (4.0s)
LAST_FRAME = 312         # stop before the fade to black (~10.4s)
FREEZE = {"home": 120, "about": 180, "projects": 252, "contact": 310}
SIZES = [1280, 1920, 2560]
STILL_SIZE = 3840
WEBP_Q = 90
WHITE_THR = 236          # how close to white counts as background
OUT = Path("public/frames")

ENCLOSED_BG = None       # enclosed white this big (fraction of the frame) is background too

# portrait phones: the 9:16 video (same freeze frame numbers, runs to frame 327).
# Its About pose traps a sliver of background between arm and body (0.21-0.26%
# of the frame, frames 171-183); the largest hair shine is 0.16%, so it stays.
PORTRAIT = {"LAST_FRAME": 327, "SIZES": [720, 1080, 1440], "STILL_SIZE": 2160,
            "OUT": Path("public/frames-portrait"), "ENCLOSED_BG": 0.0019}
# --------------------------------------------------------------------------

def key(im):
    """RGB uint8 array -> RGBA uint8 array with edge-connected white removed."""
    im = im.astype(np.float32)
    mn = im.min(axis=2)
    lab, n = nd.label(mn >= WHITE_THR)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    drop = border[border > 0]
    if ENCLOSED_BG:
        sizes = nd.sum(np.ones_like(mn), lab, range(1, n + 1))
        drop = np.union1d(drop, np.nonzero(sizes >= ENCLOSED_BG * mn.size)[0] + 1)
    bg = np.isin(lab, drop)
    fg = ~bg
    band = nd.binary_dilation(bg, iterations=3) & fg
    a = fg.astype(np.float32)
    a[band] = np.clip((255 - mn) / 105.0, 0, 1)[band]
    a = nd.gaussian_filter(a, 0.6) * fg
    am = np.clip(a, 1e-3, 1)[..., None]
    rgb = np.where(a[..., None] < 0.999, (im - (1 - am) * 255) / am, im)
    return np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)

def extract(video, width, tmp, select=None):
    vf = f"scale={width}:-1:flags=lanczos"
    if select is not None:
        vf = f"select='eq(n\\,{select})'," + vf
    args = ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", vf]
    if select is not None:
        args += ["-frames:v", "1", "-fps_mode", "passthrough"]
    subprocess.run(args + [str(tmp / "f_%04d.png")], check=True)
    return sorted(tmp.glob("f_*.png"))

def main(video):
    video = Path(video)
    for s in SIZES:
        (OUT / str(s)).mkdir(parents=True, exist_ok=True)
    (OUT / "stills").mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        print("Extracting frames at 2560...")
        files = extract(video, max(SIZES), tmp)
        for i, f in enumerate(files[: LAST_FRAME + 1]):
            src = Image.open(f).convert("RGB")
            img = src if i < INTRO_END else Image.fromarray(key(np.asarray(src)), "RGBA")
            for s in SIZES:
                out = img if s == img.width else img.resize((s, round(img.height * s / img.width)), Image.LANCZOS)
                out.save(OUT / str(s) / f"{i:04d}.webp", quality=WEBP_Q, method=6)
            if i % 20 == 0:
                print(f"  frame {i}/{LAST_FRAME}")

    make_stills(video)
    print("Done ->", OUT.resolve())

def make_stills(video):
    print("Making 4K freeze stills...")
    (OUT / "stills").mkdir(parents=True, exist_ok=True)
    for name, n in FREEZE.items():
        with tempfile.TemporaryDirectory() as t:
            f = extract(video, STILL_SIZE, Path(t), select=n)[0]
            Image.fromarray(key(np.asarray(Image.open(f).convert("RGB"))), "RGBA") \
                 .save(OUT / "stills" / f"{name}.webp", quality=92, method=6)

if __name__ == "__main__":
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found - install it and add it to PATH first.")
    if "--portrait" in sys.argv:
        globals().update(PORTRAIT)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    video = Path(args[0] if args else "Animations/full_scrollable_website_animation.mp4")
    make_stills(video) if "--stills-only" in sys.argv else main(video)
