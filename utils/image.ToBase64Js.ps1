# image.ToBase64Js.ps1 — Convert an image file to a Base64 JS module
# Usage: .\image.ToBase64Js.ps1 <image-file> <output-js-file>

param(
    [string]$ImageFile = "",
    [string]$OutputFile = ""
)

# ── Help ────────────────────────────────────────────────────────────────────
if (-not $ImageFile -or -not $OutputFile) {
    Write-Host @"

  image.ToBase64Js.ps1
  ────────────────────
  Converts an image (PNG, JPG, WebP, etc.) into a self-contained JavaScript
  file that assigns the image as a Base64 data URL to a global variable.
  The output file can be included via a <script> tag so pages that cannot
  fetch external files (file://, sandboxed environments, offline use) still
  have access to the image at runtime.

  Usage:
    .\image.ToBase64Js.ps1 <image-file> <output-js-file>

  Arguments:
    image-file      Path to the source image (e.g. atlas.png)
    output-js-file  Path for the generated JS file (e.g. atlas-data.js)

  The generated file will contain a single line:
    window.ATLAS_DATA_URL = "data:<mime>;base64,<data>";

  Example:
    .\image.ToBase64Js.ps1 assets\atlas.png examples\basic\atlas-data.js

  Supported MIME types are detected automatically from the file extension:
    .png             -> image/png
    .jpg / .jpeg     -> image/jpeg
    .webp            -> image/webp
    .gif             -> image/gif
    .bmp             -> image/bmp
    .svg             -> image/svg+xml

"@
    exit 0
}

# ── Validate input ───────────────────────────────────────────────────────────
if (-not (Test-Path $ImageFile -PathType Leaf)) {
    Write-Error "Error: image file not found: $ImageFile"
    exit 1
}

# ── Detect MIME type from extension ─────────────────────────────────────────
$ext = [System.IO.Path]::GetExtension($ImageFile).TrimStart('.').ToLower()

$mime = switch ($ext) {
    "png"  { "image/png" }
    "jpg"  { "image/jpeg" }
    "jpeg" { "image/jpeg" }
    "webp" { "image/webp" }
    "gif"  { "image/gif" }
    "bmp"  { "image/bmp" }
    "svg"  { "image/svg+xml" }
    default {
        Write-Warning "Unknown extension '.$ext', defaulting MIME type to image/png"
        "image/png"
    }
}

# ── Encode ───────────────────────────────────────────────────────────────────
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $ImageFile))
$base64 = [System.Convert]::ToBase64String($bytes)

# ── Write output ─────────────────────────────────────────────────────────────
$content = "window.ATLAS_DATA_URL = `"data:$mime;base64,$base64`";"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputFile), $content)

Write-Host "Written: $OutputFile"
