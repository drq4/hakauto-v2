#!/usr/bin/env bash
# Stitch clips into one master. Extension clips already match -> hard concat.
# Use XFADE=1 to join with a 0.125s crossfade (only where a repaired piece meets an original).
#   bash production/scripts/stitch.sh production/clips/clip-a.mp4 production/clips/clip-b.mp4 production/clips/clip-c.mp4
set -euo pipefail
FF="${FFMPEG:-$(node -e "process.stdout.write(require(require('child_process').execSync('npm root -g').toString().trim()+'/ffmpeg-static'))")}"
OUT=production/clips/flythrough-master.mp4
# SIZE: output size. Use the clips' native size (e.g. SIZE=854:480) rather than upscaling.
N="${SIZE:-1920:1080}:flags=lanczos,fps=24,format=yuv420p,setsar=1"
args=(); filt=""; i=0
for c in "$@"; do args+=(-i "$c"); filt+="[$i:v]scale=$N[v$i];"; i=$((i+1)); done
if [[ "${XFADE:-0}" == 1 ]]; then
  prev="v0"; off=0
  for ((k=1;k<i;k++)); do
    d=$({ "$FF" -i "${@:$k:1}" 2>&1 || true; } | grep -o "Duration: [0-9:.]*" | awk -F'[: ]' '{print $3*3600+$4*60+$5}')
    off=$(python -c "print($off+$d-0.125)"); filt+="[$prev][v$k]xfade=transition=fade:duration=0.125:offset=$off[x$k];"; prev="x$k"
  done
  filt="${filt%;}"; map="[$prev]"
else
  for ((k=0;k<i;k++)); do filt+="[v$k]"; done; filt+="concat=n=$i:v=1:a=0[out]"; map="[out]"
fi
"$FF" -v error -y "${args[@]}" -filter_complex "$filt" -map "$map" -c:v libx264 -crf 16 -preset slow -movflags +faststart "$OUT"
echo "Master: $OUT"; bash production/scripts/inspect.sh "$OUT"
