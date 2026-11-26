# بیلد پروداکشن طبیار برای vileo.ir — خروجی وب داخل public لاراول + APK دیباگ (Windows)
# وب و API هر دو روی یک دامنه هستند؛ بعد از این اسکریپت، apps/api را با runflare deploy منتقل کنید.
param(
  [string]$ApiUrl = "https://vileo.ir",
  [switch]$SkipApk
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$web = Join-Path $root "apps\web"
$api = Join-Path $root "apps\api"
$dist = Join-Path $web "dist"
$pub = Join-Path $api "public"

$env:VITE_API_URL = $ApiUrl

Push-Location $web
try {
  npm run build
  npx cap sync android
} finally {
  Pop-Location
}

# پاک‌سازی خروجی بیلد قبلی از public — فایل‌های لاراول (index.php, .htaccess, ...) دست‌نخورده می‌مانند
# توجه: پوشه‌های fonts و design عمداً پاک نمی‌شوند چون فایل‌های دیگر (مثل fonts/filament فیلامنت)
# داخلشان است؛ کپی merge انجام می‌شود و فایل‌های همنام جایگزین می‌شوند.
$stale = @(
  "assets",
  "index.html", "manifest.webmanifest", "registerSW.js", "sw.js",
  "favicon.svg", "icons.svg",
  "pwa-192x192.png", "pwa-512x512.png", "maskable-512x512.png", "apple-touch-icon.png"
)
foreach ($item in $stale) {
  $p = Join-Path $pub $item
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}
Get-ChildItem $pub -Filter "workbox-*.js" -ErrorAction SilentlyContinue | Remove-Item -Force

Copy-Item (Join-Path $dist "*") $pub -Recurse -Force
Write-Host "Web build -> $pub"

if (-not $SkipApk) {
  $jdk = Join-Path $web ".tools\jdk-21.0.13+9"
  $sdk = Join-Path $web ".tools\android-sdk"

  if (-not (Test-Path (Join-Path $jdk "bin\java.exe"))) {
    Write-Error "JDK 21 در apps/web/.tools یافت نشد."
  }
  if (-not (Test-Path (Join-Path $sdk "platforms\android-36"))) {
    Write-Error "Android SDK در apps/web/.tools/android-sdk یافت نشد."
  }

  $env:JAVA_HOME = $jdk
  $env:ANDROID_SDK_ROOT = $sdk
  $env:ANDROID_HOME = $sdk

  Push-Location (Join-Path $web "android")
  try {
    .\gradlew.bat assembleDebug --no-daemon
  } finally {
    Pop-Location
  }

  $apk = Join-Path $web "android\app\build\outputs\apk\debug\app-debug.apk"
  $out = Join-Path $root "release\tebyar-debug.apk"
  New-Item -ItemType Directory -Force -Path (Join-Path $root "release") | Out-Null
  Copy-Item $apk $out -Force
  Write-Host "APK: $out"
}
