#!/usr/bin/env bash
# HAK AUTO fly-through — Higgsfield generation steps (GPT Image 2.5 + Seedance 2.5).
# Run from the project root. Each step logs job JSON to production/jobs/ and downloads the result.
# Defaults follow the 270-credit plan: 10 s clips at 720p (7 credits/s), stills drafted at medium quality.
#   bash production/scripts/generate.sh test                          # 1-credit still: proves API access works
#   bash production/scripts/generate.sh stills                        # 2 start-still options, medium (~2 credits)
#   bash production/scripts/generate.sh final-still <a|b>             # chosen start still at high quality (~3)
#   bash production/scripts/generate.sh reveal  <start-still.png>       # reveal reference still (~3 credits)
#   bash production/scripts/generate.sh clip-a  <start-still.png>       # 10 s i2v (~70 credits)
#   bash production/scripts/generate.sh clip-b  <clip-a.mp4|job-id>     # 10 s forward extension (~70+ credits)
#   bash production/scripts/generate.sh clip-c  <clip-b.mp4|job-id> <reveal.png>   # 10 s extension + reveal ref (~70+)
# Env: RES=480p|720p|1080p (3/7/12 credits per second), DUR=seconds, DRAFT=1 for a cheap draft render (3/s).
set -euo pipefail
P=production; RES="${RES:-720p}"; DUR="${DUR:-10}"
DRAFTARG=(); [[ "${DRAFT:-0}" == 1 ]] && DRAFTARG=(--draft true)
mkdir -p $P/jobs $P/stills $P/clips

save() { # $1 = name, stdin = JSON from --wait --json
  local name="$1" json="$P/jobs/$1.json"
  cat > "$json"
  python - "$json" "$name" <<'PY'
import json, re, sys, subprocess, pathlib
path, name = sys.argv[1], sys.argv[2]
raw = open(path, encoding="utf-8").read()
urls = re.findall(r'https?://[^"\s]+\.(?:mp4|png|jpg|jpeg|webp)(?:\?[^"\s]*)?', raw)
if not urls: sys.exit("no media URL in " + path)
url = urls[0]
ext = re.search(r'\.(mp4|png|jpg|jpeg|webp)', url).group(1)
out = pathlib.Path("production") / ("clips" if ext == "mp4" else "stills") / f"{name}.{ext}"
subprocess.run(["curl", "-sSL", url, "-o", str(out)], check=True)
ids = re.findall(r'"id"\s*:\s*"([0-9a-f-]{36})"', raw)
print(f"{name}: {out}  job={ids[0] if ids else '?'}")
PY
  higgsfield account status | sed 's/^/  balance: /'
}

case "${1:-}" in
  stills)
    higgsfield generate create gpt_image_2_5 --prompt "$(cat $P/prompts/still-start-a-daylight.txt)" --image $P/stills/garage-source.jpg \
      --aspect_ratio 16:9 --resolution 2k --quality high --wait --json | save start-a-daylight
    higgsfield generate create gpt_image_2_5 --prompt "$(cat $P/prompts/still-start-b-bluehour.txt)" --image $P/stills/garage-source.jpg \
      --aspect_ratio 16:9 --resolution 2k --quality high --wait --json | save start-b-bluehour ;;
  reveal)
    higgsfield generate create gpt_image_2_5 --prompt "$(cat $P/prompts/still-reveal.txt)" --image "$2" --image $P/stills/garage-source.jpg \
      --aspect_ratio 16:9 --resolution 2k --quality high --wait --json | save reveal ;;
  clip-a)
    higgsfield generate create seedance_2_5 --mode omni_reference --start-image "$2" --prompt "$(cat $P/prompts/clip-a-entrance-showroom.txt)" \
      --duration "$DUR" --resolution "$RES" --aspect_ratio 16:9 --generate_audio false "${DRAFTARG[@]}" --wait --wait-timeout 30m --json | save clip-a${DRAFT:+-draft} ;;
  clip-b)
    higgsfield generate create seedance_2_5 --mode video_extension --extension_mode forward --video "$2" --prompt "$(cat $P/prompts/clip-b-reception-atelier.txt)" \
      --duration "$DUR" --resolution "$RES" --aspect_ratio 16:9 --generate_audio false "${DRAFTARG[@]}" --wait --wait-timeout 30m --json | save clip-b${DRAFT:+-draft} ;;
  clip-c)
    higgsfield generate create seedance_2_5 --mode video_extension --extension_mode forward --video "$2" --image "$3" --prompt "$(cat $P/prompts/clip-c-exit-reveal.txt)" \
      --duration "$DUR" --resolution "$RES" --aspect_ratio 16:9 --generate_audio false "${DRAFTARG[@]}" --wait --wait-timeout 30m --json | save clip-c${DRAFT:+-draft} ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
