"""Pre-compute footage brightness behind each copy position, per frame, into the flight manifest.

    python production/scripts/luma.py [site/media/flight]

The site uses it to set the strength of the smoked-glass panel behind chapter copy
(darker over bright frames, lighter over dark ones) with zero runtime cost.
Regions (fractions of the 16:9 frame): left/right/center copy blocks on desktop, and the
bottom of the centre crop that phones show. A rolling max over +-0.5 s makes the panel
darken slightly *before* a bright highlight arrives instead of reacting late.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageStat

REGIONS = {
    "left":   (0.00, 0.30, 0.50, 0.92),
    "right":  (0.50, 0.30, 1.00, 0.92),
    "center": (0.20, 0.30, 0.80, 0.92),
    "mobile": (0.34, 0.45, 0.66, 1.00),
}


def region_luma(im, box):
    w, h = im.size
    crop = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    st = ImageStat.Stat(crop)
    hist = crop.histogram()
    # 85th percentile: highlights hurt legibility more than the average suggests
    total, acc, p85 = sum(hist), 0, 255
    for v, c in enumerate(hist):
        acc += c
        if acc >= total * 0.85:
            p85 = v
            break
    return 0.5 * st.mean[0] + 0.5 * p85


def write_luma(flight_dir):
    flight_dir = Path(flight_dir)
    mpath = flight_dir / "manifest.json"
    m = json.loads(mpath.read_text())
    frames = [flight_dir / (m["pattern"].replace("%04d", f"{i + m.get('start', 0):04d}")) for i in range(m["count"])]
    raw = {k: [] for k in REGIONS}
    for f in frames:
        im = Image.open(f).convert("L").resize((160, 90))
        for k, box in REGIONS.items():
            raw[k].append(region_luma(im, box))
    win = max(1, round(m["fps"] * 0.5))
    m["luma"] = {k: [int(round(max(v[max(0, i - win): i + win + 1]))) for i in range(len(v))] for k, v in raw.items()}
    mpath.write_text(json.dumps(m, indent=2))
    print(f"luma written for {len(frames)} frames: " + ", ".join(f"{k} {min(v)}-{max(v)}" for k, v in m["luma"].items()))


if __name__ == "__main__":
    write_luma(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "site/media/flight")
