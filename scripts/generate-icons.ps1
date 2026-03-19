# generate-icons.ps1
# Génère toutes les icônes Android depuis assets/images/logo.png

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Common -ErrorAction SilentlyContinue

$ROOT    = Split-Path $PSScriptRoot -Parent
$SRC     = Join-Path $ROOT "assets\images\logo.png"
$RESDIR  = Join-Path $ROOT "android\app\src\main\res"

if (-not (Test-Path $SRC)) {
    Write-Host "ERREUR : logo.png introuvable dans assets/images/" -ForegroundColor Red
    exit 1
}

$logo = [System.Drawing.Image]::FromFile($SRC)

# ─── Tailles par densité ────────────────────────────────────────────────────
# launcher = icône normale, foreground = icône adaptative (avec marge)
$densities = @(
    @{ folder = "mipmap-mdpi";    launcher = 48;  foreground = 108 },
    @{ folder = "mipmap-hdpi";    launcher = 72;  foreground = 162 },
    @{ folder = "mipmap-xhdpi";   launcher = 96;  foreground = 216 },
    @{ folder = "mipmap-xxhdpi";  launcher = 144; foreground = 324 },
    @{ folder = "mipmap-xxxhdpi"; launcher = 192; foreground = 432 }
)

# ─── Helpers ────────────────────────────────────────────────────────────────

function New-Canvas($size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    return $bmp, $g
}

function Save-Png($bmp, $path) {
    $dir = Split-Path $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# ─── ic_launcher.png  (logo sur fond noir carré) ───────────────────────────
function Make-Launcher($size, $outPath) {
    $bmp, $g = New-Canvas $size
    $g.Clear([System.Drawing.Color]::Black)
    # marge 10 %
    $pad  = [int]($size * 0.10)
    $area = $size - $pad * 2
    $g.DrawImage($logo, $pad, $pad, $area, $area)
    Save-Png $bmp $outPath
    $g.Dispose(); $bmp.Dispose()
}

# ─── ic_launcher_round.png  (logo dans cercle noir) ────────────────────────
function Make-Round($size, $outPath) {
    $bmp, $g = New-Canvas $size
    $g.Clear([System.Drawing.Color]::Transparent)

    # Cercle de fond noir
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size - 1, $size - 1)
    $g.SetClip($path)
    $g.Clear([System.Drawing.Color]::Black)

    # Logo centré avec marge 10 %
    $pad  = [int]($size * 0.10)
    $area = $size - $pad * 2
    $g.DrawImage($logo, $pad, $pad, $area, $area)

    $g.ResetClip()
    Save-Png $bmp $outPath
    $g.Dispose(); $bmp.Dispose(); $path.Dispose()
}

# ─── ic_launcher_foreground.png  (logo centré, fond transparent, marge 25%) ─
function Make-Foreground($size, $outPath) {
    $bmp, $g = New-Canvas $size
    $g.Clear([System.Drawing.Color]::Transparent)
    # Marge 25 % = zone safe adaptative
    $pad  = [int]($size * 0.25)
    $area = $size - $pad * 2
    $g.DrawImage($logo, $pad, $pad, $area, $area)
    Save-Png $bmp $outPath
    $g.Dispose(); $bmp.Dispose()
}

# ─── Génération ─────────────────────────────────────────────────────────────
Write-Host "`n🎨  Génération des icônes BF1 TV...`n"

foreach ($d in $densities) {
    $dir = Join-Path $RESDIR $d.folder
    $sz  = $d.launcher
    $fgz = $d.foreground

    Make-Launcher   $sz  (Join-Path $dir "ic_launcher.png")
    Make-Round      $sz  (Join-Path $dir "ic_launcher_round.png")
    Make-Foreground $fgz (Join-Path $dir "ic_launcher_foreground.png")

    Write-Host "  ✅  $($d.folder)  (${sz}px launcher / ${fgz}px foreground)"
}

$logo.Dispose()

Write-Host "`n✨  Toutes les icônes ont été générées dans android/app/src/main/res/`n"
