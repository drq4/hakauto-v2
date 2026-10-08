#!/usr/bin/env bash
# Extract the last frame of a clip as PNG (fallback start frame when "Extend" isn't available).
#   bash production/scripts/last-frame.sh production/clips/clip-a.mp4   ->  production/clips/clip-a-last.png
set -euo pipefail
FF="${FFMPEG:-$(node -e "process.stdout.write(require(require('child_process').execSync('npm root -g').toString().trim()+'/ffmpeg-static'))")}"
in="$1"; out="${in%.*}-last.png"
"$FF" -v error -y -sseof -0.2 -i "$in" -update 1 -frames:v 1 "$out"
echo "$out"
