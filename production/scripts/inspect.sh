#!/usr/bin/env bash
# Inspect a clip: contact sheet (2 fps), hidden-cut detection, first/last frames.
#   bash production/scripts/inspect.sh production/clips/clip-a.mp4
set -euo pipefail
FF="${FFMPEG:-$(node -e "process.stdout.write(require(require('child_process').execSync('npm root -g').toString().trim()+'/ffmpeg-static'))")}"
in="$1"; base="${in%.*}"; mkdir -p "$base-inspect"
"$FF" -v error -y -i "$in" -vf "fps=2,scale=384:-2,tile=6x5" -frames:v 1 "$base-inspect/contact.jpg"
"$FF" -v error -y -sseof -3 -i "$in" -vf "fps=4,scale=640:-2,tile=4x3" -frames:v 1 "$base-inspect/tail.jpg"
"$FF" -v error -y -i "$in" -vf "select=eq(n\,0)" -frames:v 1 "$base-inspect/first.png"
"$FF" -v error -y -sseof -0.1 -i "$in" -update 1 -frames:v 1 "$base-inspect/last.png"
echo "Scene cuts (score > 0.3):"
"$FF" -hide_banner -i "$in" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o "pts_time:[0-9.]*" || echo "  none"
echo "Wrote $base-inspect/{contact,tail}.jpg and first/last.png"
