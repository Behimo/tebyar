# ساخت APK دیباگ طبیار (Windows)
param(
  [string]$ApiUrl = "http://192.168.1.104:8000"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$web = Join-Path $root "apps\web"
$jdk = Join-Path $web ".tools\jdk-21.0.13+9"
$sdk = Join-Path $web ".tools\android-sdk"

if (-not (Test-Path (Join-Path $jdk "bin\java.exe"))) {
  Write-Error "JDK 21 در apps/web/.tools یافت نشد. یک بار با Android Studio یا اسکریپت نصب SDK/JDK را اجرا کنید."
}
if (-not (Test-Path (Join-Path $sdk "platforms\android-36"))) {
  Write-Error "Android SDK در apps/web/.tools/android-sdk یافت نشد."
}

$env:JAVA_HOME = $jdk
$env:ANDROID_SDK_ROOT = $sdk
$env:ANDROID_HOME = $sdk
$env:VITE_API_URL = $ApiUrl

Push-Location $web
try {
  npm run build
  npx cap sync android
  Push-Location android
  .\gradlew.bat assembleDebug --no-daemon
  $apk = "app\build\outputs\apk\debug\app-debug.apk"
  $out = Join-Path $root "release\tebyar-debug.apk"
  New-Item -ItemType Directory -Force -Path (Join-Path $root "release") | Out-Null
  Copy-Item $apk $out -Force
  Write-Host "APK: $out"
} finally {
  Pop-Location
  Pop-Location
}