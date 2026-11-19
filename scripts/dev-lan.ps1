# توسعه با HMR روی گوشی (مرورگر همان Wi‑Fi)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$api = Join-Path $root "apps\api"
$web = Join-Path $root "apps\web"

$ip = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.PrefixOrigin -ne 'WellKnown' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress
)
if (-not $ip) { $ip = "127.0.0.1" }

Write-Host ""
Write-Host "=== طبیار — حالت لایو روی گوشی ===" -ForegroundColor Cyan
Write-Host "1) API (ترمینال جدا یا همین پنجره در پس‌زمینه):"
Write-Host "   cd apps\api"
Write-Host "   php artisan serve --host=0.0.0.0 --port=8000"
Write-Host ""
Write-Host "2) روی گوشی در Chrome باز کن:"
Write-Host "   http://${ip}:5173" -ForegroundColor Green
Write-Host ""
Write-Host "گوشی و PC باید روی یک Wi‑Fi باشند. فایروال ویندوز را برای پورت 5173 و 8000 اجازه بده."
Write-Host "Chrome اندروید ۱۴+: اگر ERR_TOO_MANY_RETRIES دیدی:"
Write-Host "   تنظیمات > برنامه‌ها > Chrome > مجوزها > دستگاه‌های نزدیک (Nearby devices) > Allow"
Write-Host "   اگر Allow بود: یک‌بار Don't allow کن، دوباره Allow، بعد Force stop برای Chrome."
Write-Host ""

$env:VITE_HMR_HOST = $ip
Push-Location $web
try {
  npm run dev:lan
} finally {
  Pop-Location
}