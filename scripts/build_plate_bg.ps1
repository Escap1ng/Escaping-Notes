# Bake the landscape originals in plates-src/ into the "plate" backdrops that sit below the
# home hero. ASCII-only on purpose: Windows PowerShell 5.1 decodes .ps1 with
# the ANSI codepage, so Chinese comments here eat the closing quote of the next string
# and the file fails to parse. The rationale lives in the home-page entry of docs/design.md's
# page-by-page section (that section replaced the old section 10, which was pruned -- do not
# re-add a section number here); the command itself is the bg:build script in package.json.
#
# Why PowerShell + System.Drawing: this box has neither sharp nor PIL, and installing
# either means a network fetch.
# Where blur lives now, two different answers:
#   hero    -- baked ($BLUR_HERO unused today, kept as a knob). Zero frames on the first screen.
#   drawer  -- NOT baked. It is a runtime CSS filter driven by --plate-blur (0-12px slider,
#              default 0 = no filter emitted at all), because the author asked to see the
#              plates sharp and to be able to soften them from settings. The old rule that
#              "blur must be baked or it costs frames" was about a RESIDENT backdrop-filter;
#              an opt-in filter on one background layer, off by default, is a different trade.
#
# Usage:  npm run bg:build
# Out:    public/plates/plate-bg-deep.jpg     (night reading surface: desaturated cool + veiled down)
#         public/plates/plate-bg-paper{1,3,4,5,6}.jpg
#                                             (paper reading surface: sharp, graded, NO veil)
#         public/plates/plate-hero.jpg        (FIRST SCREEN base: cropped to sky+ridge, sky veiled into the page colour)
# The original never enters the repo: 1/ is gitignored, only the derived assets are kept.
#
# ColorMatrix gotcha, written down so nobody re-walks it: GDI+ is ROW = source channel,
# COLUMN = destination, i.e. out_R = R*m[0][0] + G*m[1][0] + B*m[2][0] + A*m[3][0] + m[4][0].
# The sepia matrices floating around the net are written transposed (row = output); pasting
# one gives out_G = 0.769R + 0.686G + 0.534B, column sums near 2, and the whole image
# blows out to white. $COLD and $SEPIA below keep every column sum <= 1. $HERO deliberately
# does NOT any more -- it is a brightness lift (column sums 1.18/1.27/1.29), and the clipping
# that buys is measured, not assumed: 0.64% of pixels blow on plate1 at this grade.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$SrcDir = Join-Path $Root 'plates-src'
# Derived backdrops live in their own folder, not loose in public/ next to the favicon and og
# image. Everything in public/plates/ is generated -- never hand-edit it, change 1/ and re-bake.
$OutDir = Join-Path $Root 'public\plates'
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$W = 2560     # long edge, px. The drawer plates used to be 1600 because a 13px blur hides the
              # upscaling; now that they ship sharp, 1600 stretched across a 2560 viewport reads
              # as soft, which is the exact thing "bright and sharp" rules out.
$QUALITY = 72  # was 62 -- that was tuned for a blurred image, where block edges are invisible

# The light theme's page colour, spelled out here because the hero's sky dissolve has to land
# on it EXACTLY: HorizonHero paints the strip above the photo with var(--ink-0), and every
# point of disagreement between the two shows up as a horizontal bar across the first screen.
# Keep in step with src/styles/neo.css --ink-0 in the 'out' theme.
$INK_LIGHT = [System.Drawing.Color]::FromArgb(242, 245, 249)

# Two INDEPENDENT blur knobs: how blurry the drawer is must never move how blurry the hero is.
# Larger = blurrier (the source is shrunk to 1/N then scaled back; two resamples ~ a gaussian).
# Retuning is one command, not an edit:  BLUR_HERO=8 BLUR_DRAWER=44 npm run bg:build
$BLUR_HERO = 12      # first screen: the ridge must still read as a ridge
$BLUR_DRAWER = 1     # 1 = no resample at all. The drawer's blur is NO LONGER baked in: it is a
                    # runtime parameter (--plate-blur, 0-12px slider, default 0), so the shipped
                    # asset has to carry full detail and let CSS soften it. It used to be 13
                    # (~a 12px CSS blur at this width), which made the slider a no-op at the top.
if ($env:BLUR_HERO) { $BLUR_HERO = [int]$env:BLUR_HERO }
if ($env:BLUR_DRAWER) { $BLUR_DRAWER = [int]$env:BLUR_DRAWER }
Write-Output ("blur hero={0} drawer={1}" -f $BLUR_HERO, $BLUR_DRAWER)

# Which original to use, by name. Picking "the first file in the directory" made the derived
# assets depend on directory order -- silently re-baking everything when a photo was added.
# Chosen by the author (he overruled my luminance pick): the sunset ridge, sky in the upper
# half, ridge line at 57% of the frame.
$SourceName = if ($env:SRC_HERO) { $env:SRC_HERO } else { 'hero.jpg' }

$srcPath = Join-Path $SrcDir $SourceName
if (-not (Test-Path $srcPath)) {
  $src = Get-ChildItem -Path $SrcDir -Include *.jpg, *.jpeg, *.png -File -Recurse | Select-Object -First 1
  if (-not $src) { throw "no jpg/jpeg/png original found in $SrcDir" }
  Write-Output ("warn: '{0}' not in 1/, falling back to {1}" -f $SourceName, $src.Name)
}
else {
  $src = Get-Item $srcPath
}
Write-Output ("src {0} ({1:N1} MB)" -f $src.Name, ($src.Length / 1MB))

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
if (-not $codec) { throw 'no JPEG encoder registered' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)

# 25 coefficients in row-major order (index = row*5 + col)
function New-Matrix([double[]]$v) {
  $m = New-Object System.Drawing.Imaging.ColorMatrix
  for ($k = 0; $k -lt 25; $k++) {
    $row = [int][Math]::Floor($k / 5)
    $col = $k % 5
    $prop = "matrix$row$col"
    $m.$prop = [float]$v[$k]
  }
  return $m
}

# Scale the 3x3 colour block of a matrix (indices 0-14 minus the offset column) and leave the
# offsets and alpha alone. Used to trim ONE over-bright source without touching $PAPER, which
# the other four plates share.
function Scale-Color([double[]]$m, [double]$k) {
  $r = [double[]]$m.Clone()
  for ($i = 0; $i -lt 15; $i++) {
    if (($i % 5) -ne 4) { $r[$i] = $m[$i] * $k }
  }
  return ,$r
}

function New-Bmp([int]$w, [int]$h) {
  $b = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  # PixelOffsetMode.Half keeps bicubic from sampling outside the source rect. (Graphics.WrapMode
  # is the textbook fix but this .NET build refuses the assignment; a 1px fringe on a heavily
  # blurred full-bleed background is not worth chasing.)
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  # return an object, not an array: PowerShell flattens returned arrays, so $r[0] / $r[1]
  # would land on whatever the enumerator felt like
  return [PSCustomObject]@{ Bmp = $b; Gfx = $g }
}

# Crop + blur + tone + veil + encode. $keep is the fraction of the source HEIGHT kept, and
# $cropTop the fraction dropped from the top, so a frame can be taken from the middle of a
# photo (the hero wants the band between the cloud and the car park). $veilTop, when > 0,
# lays a vertical gradient of $veilColor over the top $veilTop of the OUTPUT frame, opaque at
# row 0 and reaching zero at $veilTop -- this is the first screen's sky dissolve, see below.
function Add-SkyVeil([System.Drawing.Graphics]$g, [int]$w, [int]$h, [double]$frac,
                     [System.Drawing.Color]$c) {
  if ($frac -le 0) { return }
  $vh = [int][Math]::Max(1, [Math]::Round($h * $frac))
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $vh)
  # smoothstep, not linear: a linear ramp has a slope kink where it meets the flat page
  # colour above it, and a kink at that boundary is exactly what reads as a horizontal bar.
  # Piecewise linear over 9 stops; the first one (255 -> 244 across an eighth of the span)
  # is what makes the entry slope close enough to zero.
  $alphas = @(255, 244, 215, 174, 128, 81, 40, 11, 0)
  $positions = @(0.0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0)
  $n = $alphas.Count
  $els = New-Object 'System.Drawing.Color[]' $n
  $pos = New-Object 'System.Single[]' $n
  for ($k = 0; $k -lt $n; $k++) {
    $els[$k] = [System.Drawing.Color]::FromArgb([int]$alphas[$k], $c.R, $c.G, $c.B)
    $pos[$k] = [single]$positions[$k]
  }
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  # The public property is Colors, not Elements (Elements is the internal field name the
  # C# docs show); assigning it throws PropertyAssignmentException. Count is a getter that
  # mirrors Colors.Length, so it must not be assigned either.
  $blend.Colors = $els
  $blend.Positions = $pos
  $lgb = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $els[0], $els[($n - 1)], [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
  $lgb.InterpolationColors = $blend
  $g.FillRectangle($lgb, $rect)
  $lgb.Dispose()
}

function Bake($img, [string]$out, [double[]]$matrix, [System.Drawing.Color]$veil, [double]$veilA,
              [int]$blur = $BLUR_DRAWER, [double]$keep = 1.0, [int]$w = $W,
              [double]$cropTop = 0.0, [double]$veilTop = 0.0,
              [System.Drawing.Color]$veilTopColor = $INK_LIGHT) {
  $y0 = [int][Math]::Round($img.Height * $cropTop)
  $srcH = [int][Math]::Round($img.Height * $keep) - $y0
  $ratio = $w / $img.Width
  $h = [int][Math]::Round($srcH * $ratio)
  $sw = [int][Math]::Max(2, [Math]::Round($w / $blur))
  $sh = [int][Math]::Max(2, [Math]::Round($h / $blur))

  $t1 = New-Bmp $w $h
  $srcRect = New-Object System.Drawing.Rectangle(0, $y0, $img.Width, $srcH)
  $t1.Gfx.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), $srcRect,
    [System.Drawing.GraphicsUnit]::Pixel)

  $t2 = New-Bmp $sw $sh
  $t2.Gfx.DrawImage($t1.Bmp, (New-Object System.Drawing.Rectangle(0, 0, $sw, $sh)))
  $t1.Gfx.Dispose(); $t2.Gfx.Dispose()

  $t3 = New-Bmp $w $h
  $ia = New-Object System.Drawing.Imaging.ImageAttributes
  $ia.SetColorMatrix((New-Matrix $matrix))
  $dest = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $t3.Gfx.DrawImage($t2.Bmp, $dest, 0, 0, $t2.Bmp.Width, $t2.Bmp.Height,
    [System.Drawing.GraphicsUnit]::Pixel, $ia)
  if ($veilA -gt 0) {  # the theme veil is load bearing: text has to stand on top of it
    $br = New-Object System.Drawing.SolidBrush(
      [System.Drawing.Color]::FromArgb([int][Math]::Round($veilA * 255), $veil))
    $t3.Gfx.FillRectangle($br, $dest)
    $br.Dispose()
  }
  Add-SkyVeil $t3.Gfx $w $h $veilTop $veilTopColor
  $ia.Dispose(); $t3.Gfx.Dispose()
  $t1.Bmp.Dispose(); $t2.Bmp.Dispose()
  $t3.Bmp.Save($out, $codec, $ep); $t3.Bmp.Dispose()
  Write-Output ("out {0} {1}x{2} {3:N0} KB" -f (Split-Path -Leaf $out), $w, $h,
    ((Get-Item $out).Length / 1KB))
}

# deep: desaturate with blue weighted highest, red lowest, land between 0.4 and 0.8
$COLD = @(
  0.10, 0.15, 0.20, 0, 0,
  0.25, 0.35, 0.45, 0, 0,
  0.05, 0.10, 0.15, 0, 0,
  0.00, 0.00, 0.00, 1, 0,
  0.010, 0.015, 0.030, 0, 1
)
# paper: warm dry-plate sepia (R > G > B), offset lifted toward the paper colour
$SEPIA = @(
  0.30, 0.26, 0.20, 0, 0,
  0.59, 0.52, 0.41, 0, 0,
  0.15, 0.13, 0.10, 0, 0,
  0.00, 0.00, 0.00, 1, 0,
  0.12, 0.10, 0.07, 0, 1
)

# first-screen grade, COOL. The author does not want the old cream/beige direction, so red is
# pulled down hard (0.72 diagonal) and blue is kept near unity -- the photo's own warm horizon
# glow turns steel-blue instead of cream. White in -> (0.76, 0.90, 1.02) = blue-dominant;
# black in -> (0.01, 0.03, 0.06) = cool shadow, NOT lifted toward paper.
$HERO = @(
  0.72, 0.03, 0.00, 0, 0,
  0.03, 0.80, 0.04, 0, 0,
  0.00, 0.04, 0.92, 0, 0,
  0.00, 0.00, 0.00, 1, 0,
  0.01, 0.03, 0.06, 0, 1
)

# First-screen frame, in source rows of the hero original (6000x3470). Measured, not guessed:
# the summit tip sits at row 1120 (read off a gridded render at 25px), the dark cloud band ends
# near row 250, and the car park starts below row 2600.
#   700  -- top of the frame. CSS pins this row to the strip's top edge (background-position
#          50% 0), so the veil's opaque start is ALWAYS the boundary. Before this, `cover` with
#          a percentage position moved the boundary anywhere from source row 0 to 930 depending
#          on viewport, which is why no fixed CSS fade could ever have matched the page colour.
#   1120 -- summit. The sky veil reaches alpha 0 exactly here, so the mountain carries no veil.
#   2560 -- bottom of the frame.
$HERO_TOP = 700
$HERO_SUMMIT = 1120
$HERO_BOTTOM = 2560

# PAPER = the same hue curve as $HERO (R pulled, B high) with the diagonal raised to
# 1.15/1.20/1.25 and NO black offset. The author picked this grade off a rendered comparison
# (meanL 115.7, std 53.2, 0.64% highlights clipped on plate1) -- those numbers are the check:
# re-measure plate-bg-paper1.jpg after any edit here and they should still come out.
# It is deliberately NOT applied to $HERO: the first screen's mountain base is the dark anchor
# the whole top/bottom-split fix rests on, and a 1.2x gain lifts it back toward the sky's own tone.
# Same hue family, different brightness -- not the old cool/beige split, which was a hue
# inversion and IS what made the two halves look like different sites.
$PAPER = @(
  1.15, 0.03, 0.00, 0, 0,
  0.03, 1.20, 0.04, 0, 0,
  0.00, 0.04, 1.25, 0, 0,
  0.00, 0.00, 0.00, 1, 0,
  0.00, 0.00, 0.00, 0, 1
)

# Per-source brightness trim on top of $PAPER, for originals $PAPER's 1.15-1.25 gain cannot
# serve. plate1 is mid-key (meanL 91.8 before grading -> 116.1 after) and wants that gain;
# plate5 is a HIGH-KEY beach already at meanL 184.4, so the same matrix lands it at 227.4 with
# 49.4% of sampled pixels at 250 or over -- a white hole both in the drawer and in its gallery
# card. 0.70 measures meanL 161.5, std 22.3, 0.0% clipped: still the brightest of the five
# (paper6 is 130.2), but the sun reads as a light source again instead of as the page colour.
# Below that the photo loses its glow faster than its detail -- 0.62 is meanL 143.1 / std 19.7
# and reads as dusk. Numbers come from sampling the baked jpgs; re-measure after editing one.
$PAPER_TRIM = @{ 'plate5.jpg' = 0.70 }

# The author asked for full resolution with no extra compression, so the hero is NOT downscaled
# to $W -- it keeps the source's own width and only gets the grade above. blur=1 means the
# shrink/scale pair is 1:1, i.e. no blur at all.
$QUALITY_HERO = 90

# The drawer may use a DIFFERENT photo from the hero -- that is the author's design (plates 1-3).
# The fold leak that made me collapse these was a layering bug, not a subject conflict: the
# fixed drawer layer also lives behind the hero, so the hero now paints an opaque floor
# (see HorizonHero .hero background) and the two photos meet only AT the fold, never through it.
#
# Source names are ASCII now (plates-src/ holds copies of 1/'s photos renamed to hero.jpg /
# plate1.jpg / plate3-6.jpg / article1-2.jpg; plate2.jpg moved to the article pipeline, see
# build_post_covers.ps1), so the defaults below are safe to keep in this file --
# PowerShell 5.1 decodes .ps1 with the ANSI codepage, and a Chinese literal here once silently
# swallowed the following statement: the script "succeeded" while producing one file short.
# Override without editing:  SRC_HERO=plate4.jpg SRC_PLATE=plate6.jpg npm run bg:build
$SourceName = if ($env:SRC_HERO) { $env:SRC_HERO } else { 'hero.jpg' }
$SourcePlate = if ($env:SRC_PLATE) { $env:SRC_PLATE } else { 'plate1.jpg' }
if (-not (Test-Path (Join-Path $SrcDir $SourcePlate))) { throw "drawer source '$SourcePlate' not in 1/" }

$full = [System.Drawing.Image]::FromFile($src.FullName)
$plate = [System.Drawing.Image]::FromFile((Join-Path $SrcDir $SourcePlate))
try {
  Write-Output ("src px {0}x{1} / plate {2} {3}x{4} blur {5}" -f `
    $full.Width, $full.Height, $SourcePlate, $plate.Width, $plate.Height, $BLUR_DRAWER)
  # The veil on the paper plates is GONE (it was 0.42 of the page colour, flat over the whole
  # frame). That wash -- not the blur -- is what made them read as grey film: the top row measured
  # #75849A against a #F2F5F9 page, 3.4:1 apart. Legibility is handed back to the cards and the
  # --_sky-mask dark band instead. The deep plate KEEPS its 0.62 veil for now: in the night theme
  # that wash is what the dark identity stands on, and lifting it would put #f4f1ea text on a
  # mid-tone photo. Flagged, not silently kept -- see the report.
  Bake $plate (Join-Path $OutDir 'plate-bg-deep.jpg') $COLD ([System.Drawing.Color]::FromArgb(2, 2, 4)) 0.62
  # The drawer used to run $SEPIA, so one photo was cool-blue above the fold and beige below it
  # -- that split IS the "top and bottom don't belong together" complaint, not a taste issue.
  # It now runs $PAPER: same hue curve as the hero's $HERO, brighter diagonal, no black offset.
  # See the $PAPER block for why the two are not simply the same matrix.
  # The drawer rotates through five backdrops (plate1/3/4/5/6 -- plate2.jpg left for article 3,
  # and build_post_covers.ps1 is the only script that reads it now).
  # One bake pass per source; the dark theme keeps the single $SourcePlate variant above.
  foreach ($n in @('plate1.jpg', 'plate3.jpg', 'plate4.jpg', 'plate5.jpg', 'plate6.jpg')) {
    $idx = $n.Substring(5, 1)
    $trim = 1.0
    if ($PAPER_TRIM.ContainsKey($n)) { $trim = $PAPER_TRIM[$n] }
    $imgN = [System.Drawing.Image]::FromFile((Join-Path $SrcDir $n))
    Write-Output ("paper{0} <- {1} trim {2:N2}" -f $idx, $n, $trim)
    Bake $imgN (Join-Path $OutDir ("plate-bg-paper{0}.jpg" -f $idx)) (Scale-Color $PAPER $trim) `
      ([System.Drawing.Color]::FromArgb(242, 245, 249)) 0.0
    $imgN.Dispose()
  }
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY_HERO)
  Bake $full (Join-Path $OutDir 'plate-hero.jpg') $HERO ([System.Drawing.Color]::FromArgb(0, 0, 0)) 0.0 1 `
    -w $full.Width -keep ($HERO_BOTTOM / $full.Height) -cropTop ($HERO_TOP / $full.Height) `
    -veilTop (($HERO_SUMMIT - $HERO_TOP) / [double]($HERO_BOTTOM - $HERO_TOP))
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$QUALITY)
}
finally {
  $full.Dispose()
  $plate.Dispose()
  [System.GC]::Collect()
}
