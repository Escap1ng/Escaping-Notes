# Bake the article originals in plates-src/ into the web-sized covers that live under
# public/posts/. ASCII-only on purpose: Windows PowerShell 5.1 decodes .ps1 with the ANSI
# codepage, so a Chinese comment eats the closing quote of the NEXT string and the file
# stops parsing -- the failure looks like a missing bracket, far from its cause.
#
# Why PowerShell + System.Drawing: this box has neither sharp nor PIL, and installing either
# means a network fetch (same reason as build_plate_bg.ps1).
#
# The originals never enter the repo: plates-src/ is gitignored, only the derived files under
# public/posts/ are committed.
#
# Usage:  npm run cover:build
# Out:    public/posts/core-idea.jpg            (article 1: card cover AND in-body image)
#         public/posts/hello-world.jpg          (article 2: ditto)
#         public/posts/writing-and-uploading.jpg (article 3: ditto; plate2.jpg was a drawer
#                                                 backdrop until it moved here)
#
# The mapping below is by hand, not by directory order. "Take the first jpg in the folder"
# makes a committed asset depend on whatever was dropped into plates-src/ last.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$SrcDir = Join-Path $Root 'plates-src'
$OutDir = Join-Path $Root 'public\posts'
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

# Long edge in px. The widest this asset is ever drawn is the reading column, which caps at
# --measure = 44 x 20px = 880 CSS px (see neo.css 6c), so 1600 covers a 2x display with room
# to spare. Quality sits above bg:build's 62 on purpose: those two are blurred backdrops,
# these are photographs a reader looks AT and can open in the lightbox.
$W = 1600
$QUALITY = 72
if ($env:COVER_W) { $W = [int]$env:COVER_W }
if ($env:COVER_Q) { $QUALITY = [int]$env:COVER_Q }
Write-Output ("long edge={0} quality={1}" -f $W, $QUALITY)

$Map = [ordered]@{
  'article1.jpg' = 'core-idea.jpg'
  'article2.jpg' = 'hello-world.jpg'
  # plate2.jpg was the second drawer backdrop (build_plate_bg.ps1 baked a graded copy of it
  # into public/plates/plate-bg-paper2.jpg). It is an article photograph now, and only this
  # script reads it -- the drawer rotates the other two.
  'plate2.jpg' = 'writing-and-uploading.jpg'
}

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
if (-not $codec) { throw 'no JPEG encoder registered' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)

foreach ($name in $Map.Keys) {
  $src = Join-Path $SrcDir $name
  if (-not (Test-Path $src)) { throw "missing source: $src" }
  $out = Join-Path $OutDir $Map[$name]

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
    # FromFile keeps the source handle open until the Image is disposed; skipping this locks
    # plates-src/ for the rest of the shell session.
    $img.Dispose()
  }
  Write-Output ("{0} -> {1}  {2}x{3}  {4:N0} KB" -f $name, $Map[$name], $w, $h,
    ((Get-Item $out).Length / 1KB))
}
