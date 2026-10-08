"""Build a mockup 'animatic' flight from real HAK AUTO photos, timed to the content.js beats.
Stand-in for the Seedance fly-through so the scroll experience can be reviewed.
    python production/animatic/build_animatic.py
"""
import json, math
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
HI = ROOT / "production/animatic/hi"
OUT = ROOT / "site/media/mockup"
W, H, FPS, DUR = 1280, 720, 8, 42.0

def load(p):
    return Image.open(p).convert("RGB")

garage = load(ROOT / "source-assets/image_9.png")
src = {k: load(next(HI.glob(k + ".*"))) for k in ["065", "107", "091", "120", "122", "069", "020"]}

def crop(im, z, cx, cy, blur=0):
    """z = fraction of the largest 16:9 window; cx, cy = centre (0..1)."""
    iw, ih = im.size
    mw, mh = (iw, iw * 9 / 16) if iw * 9 / 16 <= ih else (ih * 16 / 9, ih)
    cw, ch = mw * z, mh * z
    x = min(max(cx * iw - cw / 2, 0), iw - cw)
    y = min(max(cy * ih - ch / 2, 0), ih - ch)
    f = im.crop((int(x), int(y), int(x + cw), int(y + ch))).resize((W, H), Image.LANCZOS)
    if blur:
        f = f.filter(ImageFilter.BoxBlur(blur))
    return f

ease = lambda u: u * u * (3 - 2 * u)
lerp = lambda a, b, u: a + (b - a) * u

# (start, end, image, (z0,cx0,cy0), (z1,cx1,cy1))  — camera moves per segment
SEG = [
    (0.0, 6.4, garage, (1.0, .50, .50), (.30, .405, .66)),       # approach to the open doors
    (5.8, 10.6, src["065"], (1.0, .45, .55), (.62, .62, .58)),   # showroom: glide in, bank right
    (10.0, 14.6, src["107"], (.95, .30, .58), (.66, .55, .60)),  # showroom: along the side of a car
    (14.0, 19.4, src["091"], (1.0, .40, .55), (.58, .78, .45)),  # towards the back / reception
    (19.0, 22.6, None, None, None),                              # doorway: dark pass-through
    (22.0, 27.4, src["120"], (1.0, .45, .50), (.62, .60, .55)),  # workshop: technician
    (26.8, 31.4, src["122"], (1.0, .50, .50), (.70, .52, .55)),  # workshop: airco station
    (30.8, 34.4, src["069"], (.95, .40, .55), (.70, .55, .60)),  # out into the yard
    (34.0, 36.9, "yaw", None, None),                             # 180° yaw (whip pan)
    (36.4, 42.0, garage, (.34, .50, .55), (1.0, .50, .50)),      # pull back & climb (aerial in final)
]

def seg_frame(seg, t):
    s, e, im, a, b = seg
    u = ease(min(max((t - s) / (e - s), 0), 1))
    if im is None:
        # doorway: push into darkness and out
        base = crop(src["091"], .5, .85, .45) if u < .5 else crop(src["120"], 1.0, .45, .5)
        k = 1 - abs(u - .5) * 2
        return ImageEnhance.Brightness(base).enhance(1 - .92 * k)
    if im == "yaw":
        a_img, b_img = src["069"], src["020"]
        if u < .5:
            f = crop(a_img, .7, lerp(.55, 1.0, u * 2), .6, blur=int(18 * u * 2))
        else:
            f = crop(b_img, .8, lerp(0.0, .5, (u - .5) * 2), .55, blur=int(18 * (1 - (u - .5) * 2)))
        return f
    z, cx, cy = (lerp(a[i], b[i], u) for i in range(3))
    return crop(im, z, cx, cy)

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "frames").mkdir(exist_ok=True)
n = int(DUR * FPS) + 1
for i in range(n):
    t = i / FPS
    active = [sg for sg in SEG if sg[0] <= t <= sg[1]] or [SEG[-1]]
    frame = seg_frame(active[0], t)
    if len(active) > 1:  # crossfade the overlap between segments
        s2 = active[1]
        k = (t - s2[0]) / (active[0][1] - s2[0])
        frame = Image.blend(frame, seg_frame(s2, t), min(max(k, 0), 1))
    frame.save(OUT / "frames" / f"frame-{i:04d}.webp", quality=74)
Image.open(OUT / "frames/frame-0000.webp").save(OUT / "poster.webp")
json.dump({"version": "mockup-1", "placeholder": True, "label": "Maquette — animatic à partir de vos photos réelles",
           "count": n, "fps": FPS, "width": W, "height": H, "pattern": "frames/frame-%04d.webp", "start": 0,
           "poster": "poster.webp"}, open(OUT / "manifest.json", "w"), indent=2)
print(n, "frames")
