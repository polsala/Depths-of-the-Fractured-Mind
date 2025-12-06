#!/usr/bin/env bash

# Usage: ./mp3_to_ogg.sh /path/to/folder
# Converts all .mp3 files in the given folder (non-recursive) to .ogg
# Keeps original mp3 files.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 /path/to/folder"
  exit 1
fi

DIR="$1"

if [ ! -d "$DIR" ]; then
  echo "Error: '$DIR' is not a directory"
  exit 1
fi

# optional: check ffmpeg exists
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg not found. Please install ffmpeg first."
  exit 1
fi

# Loop over all mp3 files in directory
shopt -s nullglob
for mp3 in "$DIR"/*.mp3; do
  # extract base name without extension
  base="${mp3%.mp3}"
  ogg="${base}.ogg"

  if [ -f "$ogg" ]; then
    echo "Skipping '$mp3' -> '$ogg' (already exists)"
    continue
  fi

  echo "Converting '$mp3' -> '$ogg'"
  ffmpeg -y -i "$mp3" -c:a libvorbis -qscale:a 5 "$ogg"
done
shopt -u nullglob

echo "Done."

