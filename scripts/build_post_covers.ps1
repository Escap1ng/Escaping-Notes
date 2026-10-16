# Bake each roll's original into its web-sized cover, in place.
#
# A roll is content/posts/<slug>/. Drop the untouched photo there named cover-src.jpg
# (any *-src.jpg/.png/.webp/.tif works) and this writes cover.jpg next to it. Nothing else
# to edit: the directory IS the mapping. The hand-written $Map this replaces meant a new
# post required a commit to a PowerShell file before its cover could exist.
#
# Which files count as originals is defined once, in src/lib/schema.js (SOURCE_ORIGINAL):
# they are neither committed nor published. If the two lists ever disagree, a 5MB original
# ships to the site or a committed cover never gets baked -- both silent, so keep them equal
# (tests/content-rolls.test.mjs asserts the rule lives on both shores).
#
# ASCII-only on purpose: Windows PowerShell 5.1 decodes .ps1 with the ANSI codepage, so a
# Chinese comment eats the closing quote of the NEXT string and the file stops parsing --
# the failure looks like a missing bracket, far from its cause.
#
# Why PowerShell + System.Drawing: this box has neither sharp nor PIL, and installing either
# means a network fetch (same reason as build_plate_bg.ps1). Pages' ubuntu runner cannot run
# this script at all, which is exactly why cover.jpg is committed.
#
# Usage:  npm run cover:build
#         COVER_W=1600 COVER_Q=72 to override the two knobs below.
#         COVER_POSTS=<dir> to point at another article root (used to verify this script
#         end-to-end against a scratch directory instead of the real content/posts).

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$PostsDir = Join-Path $Root 'content\posts'
if ($env:COVER_POSTS) { $PostsDir = $env:COVER_POSTS }

if (-not (Test-Path $PostsDir)) { throw "no article directory: $PostsDir" }

# Long edge in px. The widest this asset is ever drawn is the reading column, which caps at
# --measure = 44 x 20px = 880 CSS px (see site.css 6c), so 1600 covers a 2x display with room
# to spare. Quality sits above bg:build's 62 on purpose: those two are blurred backdrops,
# these are photographs a reader looks AT and can open in the lightbox.
$W = 1600
$QUALITY = 72
if ($env:COVER_W) { $W = [int]$env:COVER_W }
if ($env:COVER_Q) { $QUALITY = [int]$env:COVER_Q }
Write-Output ("long edge={0} quality={1}" -f $W, $QUALITY)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
if (-not $codec) { throw 'no JPEG encoder registered' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)

# -Filter/-Include cannot express this: -Filter is a Win32 wildcard (no brace alternation)
# and -Include needs -Recurse. A regex on the name is the shortest thing that actually works
# on Windows PowerShell 5.1, and it mirrors SOURCE_ORIGINAL in src/lib/schema.js.
$original = '-src\.(jpe?g|png|webp|tiff?)$'
$baked = 0

foreach ($roll in (Get-ChildItem -LiteralPath $PostsDir | Where-Object { $_.PSIsContainer } | Sort-Object Name)) {
  $srcs = @(Get-ChildItem -LiteralPath $roll.FullName -File | Where-Object { $_.Name -match $original })
  if ($srcs.Count -eq 0) { continue }
  if ($srcs.Count -gt 1) {
    throw ("{0}: {1} originals found ({2}) -- keep exactly one, the script cannot pick" -f `
      $roll.Name, $srcs.Count, (($srcs | ForEach-Object { $_.Name }) -join ', '))
  }
  $src = $srcs[0].FullName
  $out = Join-Path $roll.FullName 'cover.jpg'

  # FromFile keeps the source handle open until the Image is disposed; skipping the Dispose
  # locks the roll directory for the rest of the shell session.
  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $scale = [Math]::Min(1.0, [double]$W / [Math]::Max($img.Width, $img.Height))
    $w = [int][Math]::Round($img.Width * $scale)
    $h = [int][Math]::Round($img.Height * $scale)
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    # PixelOffsetMode.Half keeps bicubic from sampling outside the source rect, which would
    # otherwise leave a dark fringe on the border row and column.
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    # Format24bppRgb: a JPEG has no alpha, and leaving it as the default 32bpp writes an
    # unused fourth channel into every pixel of the encode.
    $bmp.Save($out, $codec, $ep)
    $bmp.Dispose()
  }
  finally {
    $img.Dispose()
  }
  $baked = $baked + 1
  Write-Output ("{0}\{1} -> cover.jpg  {2}x{3}  {4:N0} KB" -f `
    $roll.Name, $srcs[0].Name, $w, $h, ((Get-Item -LiteralPath $out).Length / 1KB))
}

if ($baked -eq 0) {
  Write-Output 'no roll had an original in it: drop cover-src.jpg into content/posts/<slug>/'
}
