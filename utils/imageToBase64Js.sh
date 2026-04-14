#!/usr/bin/env bash
# imageToBase64Js.sh — Convert an image file to a Base64 JS module
# Usage: imageToBase64Js.sh <image-file> <output-js-file>

set -euo pipefail

# ── Help ────────────────────────────────────────────────────────────────────
if [ $# -lt 2 ]; then
  cat <<'EOF'

  imageToBase64Js.sh
  ──────────────────
  Converts an image (PNG, JPG, WebP, etc.) into a self-contained JavaScript
  file that assigns the image as a Base64 data URL to a global variable.
  The output file can be included via a <script> tag so pages that cannot
  fetch external files (file://, sandboxed environments, offline use) still
  have access to the image at runtime.

  Usage:
    imageToBase64Js.sh <image-file> <output-js-file>

  Arguments:
    image-file      Path to the source image (e.g. atlas.png)
    output-js-file  Path for the generated JS file (e.g. atlas-data.js)

  The generated file will contain a single line:
    window.ATLAS_DATA_URL = "data:<mime>;base64,<data>";

  Example:
    ./imageToBase64Js.sh assets/atlas.png examples/basic/atlas-data.js

  Supported MIME types are detected automatically from the file extension:
    .png             → image/png
    .jpg / .jpeg     → image/jpeg
    .webp            → image/webp
    .gif             → image/gif
    .bmp             → image/bmp
    .svg             → image/svg+xml

EOF
  exit 0
fi

IMAGE_FILE="$1"
OUTPUT_FILE="$2"

# ── Validate input ───────────────────────────────────────────────────────────
if [ ! -f "$IMAGE_FILE" ]; then
  echo "Error: image file not found: $IMAGE_FILE" >&2
  exit 1
fi

# ── Detect MIME type from extension ─────────────────────────────────────────
EXT="${IMAGE_FILE##*.}"
EXT="${EXT,,}"   # lowercase

case "$EXT" in
  png)       MIME="image/png" ;;
  jpg|jpeg)  MIME="image/jpeg" ;;
  webp)      MIME="image/webp" ;;
  gif)       MIME="image/gif" ;;
  bmp)       MIME="image/bmp" ;;
  svg)       MIME="image/svg+xml" ;;
  *)
    echo "Warning: unknown extension '.$EXT', defaulting MIME type to image/png" >&2
    MIME="image/png"
    ;;
esac

# ── Encode ───────────────────────────────────────────────────────────────────
BASE64_DATA="$(base64 -w 0 "$IMAGE_FILE")"

# ── Write output ─────────────────────────────────────────────────────────────
printf 'window.ATLAS_DATA_URL = "data:%s;base64,%s";\n' "$MIME" "$BASE64_DATA" > "$OUTPUT_FILE"

echo "Written: $OUTPUT_FILE"
