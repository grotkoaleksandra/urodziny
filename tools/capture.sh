#!/bin/bash
# Renders the share preview + card images from the real page.
# Needs the local preview running (http://localhost:8830). Re-run after
# changing the photo, seal or text, then commit img/.
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="${BASE:-http://localhost:8830/}"
shot() { # name width height query
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=6000 --window-size="$2,$3" --screenshot="img/$1.png" "$BASE?$4" >/dev/null 2>&1
  echo "img/$1.png"
}
shot og 1200 630 "capture=og&lang=en"
shot card-front 640 1070 "capture=front&lang=en"
shot card-back-pl 640 1070 "capture=back&lang=pl"
shot card-back-en 640 1070 "capture=back&lang=en"
# smaller JPEGs for link previews and email
for f in img/*.png; do sips -s format jpeg -s formatOptions 82 "$f" --out "${f%.png}.jpg" >/dev/null && rm "$f"; done
ls -la img
