"""Cut the phone-only portrait (9:19.5, modern phone shape) sequence from the landscape frames, following the per-beat
horizontal focus in site/js/content.js, plus a portrait poster and phone legibility data.

    python production/scripts/portrait.py [site/media/flight]

Same footage, pre-cropped at native resolution (never upscaled), so phones download less.
Focus is a function of the video time: inside a moving beat it eases from the beat's focus to
the next beat's focus (smoothstep), matching how the scroll engine frames landscape footage.
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[2]
# Modern phones are ~9:19.5 (390x844, 393x852, 430x932). Older 9:16 phones crop a little top/bottom instead.
ASPECT = 9 / 19.5


def load_beats():
    js = "global.window={};eval(require('fs').readFileSync('site/js/content.js','utf8'));process.stdout.write(JSON.stringify(window.HAK_CONTENT.beats))"
    return json.loads(subprocess.check_output(["node", "-e", js], cwd=ROOT, text=True))


def focus_at(beats, t):
    smooth = lambda u: u * u * (3 - 2 * u)
    for i, b in enumerate(beats):
        if b["to"] > b["from"] and b["from"] <= t <= b["to"]:
            nxt = beats[i + 1]["focus"] if i + 1 < len(beats) else b["focus"]
            return b["focus"] + (nxt - b["focus"]) * smooth((t - b["from"]) / (b["to"] - b["from"]))
    return beats[-1]["focus"] if t > beats[-1]["to"] else beats[0]["focus"]


def bottom_luma(im):
    # Copy sits on the lower part of the screen on phones: average + 85th percentile of that band.
    w, h = im.size
    crop = im.crop((0, int(h * 0.5), w, h))
    hist = crop.histogram()
    total, acc, p85 = sum(hist), 0, 255
    for v, c in enumerate(hist):
        acc += c
        if acc >= total * 0.85:
            p85 = v
            break
    return 0.5 * ImageStat.Stat(crop).mean[0] + 0.5 * p85


def main(flight_dir):
    flight_dir = Path(flight_dir)
    m = json.loads((flight_dir / "manifest.json").read_text())
    beats = load_beats()
    out = flight_dir / "frames-portrait"
    out.mkdir(exist_ok=True)
    for old in out.glob("*.webp"):
        old.unlink()
    lum = []
    for i in range(m["count"]):
        src = Image.open(flight_dir / m["pattern"].replace("%04d", f"{i:04d}")).convert("RGB")
        w, h = src.size
        cw = round(h * ASPECT)
        x = round((w - cw) * focus_at(beats, i / m["fps"]))
        frame = src.crop((x, 0, x + cw, h))
        frame.save(out / f"frame-{i:04d}.webp", quality=80)
        lum.append(bottom_luma(frame.convert("L").resize((54, 96))))
        if i == 0:
            frame.save(flight_dir / "poster-portrait.webp", quality=82)
    win = max(1, round(m["fps"] * 0.5))
    m.setdefault("luma", {})["mobile"] = [int(round(max(lum[max(0, i - win): i + win + 1]))) for i in range(len(lum))]
    m["portrait"] = "frames-portrait/frame-%04d.webp"
    m["portraitSize"] = [cw, h]
    m["portraitPoster"] = "poster-portrait.webp"
    (flight_dir / "manifest.json").write_text(json.dumps(m, indent=2))
    size = sum(p.stat().st_size for p in out.glob("*.webp"))
    print(f"portrait: {m['count']} frames {cw}x{h}, {size / 1e6:.1f} MB; mobile luma {min(m['luma']['mobile'])}-{max(m['luma']['mobile'])}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "site/media/flight")
