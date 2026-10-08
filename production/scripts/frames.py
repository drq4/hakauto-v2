"""Export the stitched master into the browser frame sequence.

    python production/scripts/frames.py production/clips/flythrough-master.mp4 [--fps 20] [--width 1440] [--quality 78]

- Extracts frames into a fresh staging dir, then swaps it into site/media/flight/.
- Writes manifest.json (count, fps, size, pattern, poster, cache-busting version).
- Writes poster.webp (= first frame) and one representative still per chapter
  (middle of each chapter's beats in site/js/content.js) for reduced-motion visitors.
- Writes a portrait-cropped 9:16 sequence for phones when --portrait is passed.
"""
import argparse, json, re, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
FLIGHT = SITE / "media" / "flight"


def ffmpeg_bin():
    root = subprocess.check_output("npm root -g", shell=True, text=True).strip()
    exe = Path(root) / "ffmpeg-static" / ("ffmpeg.exe" if sys.platform == "win32" else "ffmpeg")
    return str(exe) if exe.exists() else "ffmpeg"


def beats_from_content():
    src = (SITE / "js" / "content.js").read_text(encoding="utf-8")
    beats = []
    for m in re.finditer(r"\{\s*id:\s*\"([^\"]+)\",[^}]*?from:\s*([\d.]+),\s*to:\s*([\d.]+),\s*chapter:\s*(null|\"[^\"]+\")", src):
        beats.append({"id": m[1], "from": float(m[2]), "to": float(m[3]), "chapter": None if m[4] == "null" else m[4].strip('"')})
    return beats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("master")
    ap.add_argument("--fps", type=int, default=20)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--quality", type=int, default=78)
    ap.add_argument("--portrait", action="store_true")
    ap.add_argument("--out", default=str(FLIGHT), help="target dir (default site/media/flight)")
    a = ap.parse_args()
    out = Path(a.out)
    ff = ffmpeg_bin()

    staging = out.parent / f"flight-staging-{int(time.time())}"
    (staging / "frames").mkdir(parents=True)
    subprocess.run([ff, "-v", "error", "-i", a.master, "-an", "-vf", f"fps={a.fps},scale={a.width}:-2:flags=lanczos",
                    "-c:v", "libwebp", "-quality", str(a.quality), "-start_number", "0",
                    str(staging / "frames" / "frame-%04d.webp")], check=True)
    frames = sorted((staging / "frames").glob("frame-*.webp"))
    if not frames:
        sys.exit("no frames extracted")
    shutil.copy(frames[0], staging / "poster.webp")

    # (portrait sequence is cut after the swap by portrait.py, following the per-beat focus)

    # Chapter stills for reduced-motion / constrained devices.
    stills = {}
    for b in beats_from_content():
        if b["chapter"] and b["chapter"] not in stills:
            stills[b["chapter"]] = []
        if b["chapter"]:
            stills[b["chapter"]].append((b["from"] + b["to"]) / 2)
    for ch, times in stills.items():
        t = times[len(times) // 2]
        idx = min(int(round(t * a.fps)), len(frames) - 1)
        shutil.copy(frames[idx], staging / f"still-{ch}.webp")

    from PIL import Image
    w, h = Image.open(frames[0]).size
    manifest = {
        "version": time.strftime("%Y%m%d-%H%M%S"),
        "placeholder": False,
        "count": len(frames), "fps": a.fps, "width": w, "height": h,
        "pattern": "frames/frame-%04d.webp", "start": 0, "poster": "poster.webp",
        "stills": {ch: f"still-{ch}.webp" for ch in stills},
        "source": Path(a.master).name,
    }
    (staging / "manifest.json").write_text(json.dumps(manifest, indent=2))

    # Verify first / middle / last + total size, then swap in.
    for f in (frames[0], frames[len(frames) // 2], frames[-1]):
        Image.open(f).verify()
    size = sum(p.stat().st_size for p in staging.rglob("*") if p.is_file())
    if out.exists():
        shutil.move(str(out), str(out.parent / f"flight-old-{int(time.time())}"))
    shutil.move(str(staging), str(out))
    print(f"{len(frames)} frames @ {a.fps} fps, {w}x{h}, {size/1e6:.1f} MB -> {out}")
    sys.path.insert(0, str(Path(__file__).parent))
    from luma import write_luma
    write_luma(out)
    if a.portrait:
        from portrait import main as cut_portrait
        cut_portrait(out)
    print("Update site/js/content.js media.stills to media/flight/still-<chapter>.webp and re-time beats to the master duration.")


if __name__ == "__main__":
    main()
