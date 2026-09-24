param(
  [switch]$Install,
  [switch]$CaptureEvidence,
  [string]$EvidenceDirectory = "",
  [string]$AdbPath = "",
  [string]$ArtifactPath = ""
)

$ErrorActionPreference = "Stop"

$expectedPackage = "com.kabijoux.app"
$expectedHash = "026DE176A5C0FF06D6B81BC540B97BEFF4F3A847CB1EF7EBECD5E4CFD27690CF"
$appConfig = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '..\app.json') | ConvertFrom-Json
$expectedVersionCode = [string]$appConfig.expo.android.versionCode
if (-not $ArtifactPath) {
  $ArtifactPath = Join-Path $PSScriptRoot "..\dist\KA-Bijoux-1.1.0-vc5-auth-arm64.apk"
}
$apk = Resolve-Path -LiteralPath $ArtifactPath

if (-not $AdbPath) {
  $adbCommand = Get-Command adb -ErrorAction SilentlyContinue
  if ($adbCommand) {
    $AdbPath = $adbCommand.Source
  } elseif ($env:LOCALAPPDATA) {
    $standardAdb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
    if (Test-Path -LiteralPath $standardAdb) {
      $AdbPath = $standardAdb
    }
  }
}
if (-not $AdbPath -or -not (Test-Path -LiteralPath $AdbPath)) {
  throw "ADB não encontrado. Informe -AdbPath ou instale Android SDK Platform-Tools."
}
$adb = (Resolve-Path -LiteralPath $AdbPath).Path

$actualHash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
  throw "Hash do APK divergente. Esperado: $expectedHash. Obtido: $actualHash."
}

$devices = @(& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" })
if ($devices.Count -ne 1) {
  throw "Conecte exatamente um aparelho autorizado por USB. Encontrados: $($devices.Count)."
}

Write-Output "APK_HASH_OK=$actualHash"
Write-Output "ADB_PATH=$adb"
Write-Output "DEVICE_MANUFACTURER=$(& $adb shell getprop ro.product.manufacturer)"
Write-Output "DEVICE_MODEL=$(& $adb shell getprop ro.product.model)"
Write-Output "ANDROID_VERSION=$(& $adb shell getprop ro.build.version.release)"
Write-Output "ANDROID_SDK=$(& $adb shell getprop ro.build.version.sdk)"
Write-Output "DEVICE_RAM=$(& $adb shell cat /proc/meminfo | Select-Object -First 1)"
Write-Output "DEVICE_SIZE=$(& $adb shell wm size)"
Write-Output "DEVICE_DENSITY=$(& $adb shell wm density)"
Write-Output "PAGE_SIZE=$(& $adb shell getconf PAGE_SIZE)"

if ($Install) {
  & $adb install -r $apk
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar o APK."
  }
}

$packageLine = & $adb shell dumpsys package $expectedPackage | Select-String -Pattern "versionCode=|versionName=" | Select-Object -First 2
if (-not $packageLine) {
  throw "Pacote $expectedPackage não instalado. Execute novamente com -Install."
}
$packageText = ($packageLine | ForEach-Object { $_.Line.Trim() }) -join "`n"
if ($packageText -notmatch "versionCode=$expectedVersionCode(?:\s|$)") {
  throw "Versão instalada não corresponde ao versionCode $expectedVersionCode."
}
$packageLine | ForEach-Object { Write-Output $_.Line.Trim() }

& $adb shell monkey -p $expectedPackage -c android.intent.category.LAUNCHER 1 | Out-Null

if ($CaptureEvidence) {
  if (-not $EvidenceDirectory) {
    $EvidenceDirectory = Join-Path $PSScriptRoot "..\..\artifacts\android\device-test-evidence"
  }
  New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $screenshot = Join-Path $EvidenceDirectory "device-home-$stamp.png"
  $logcat = Join-Path $EvidenceDirectory "device-logcat-$stamp.txt"
  $remoteScreenshot = "/sdcard/ka-bijoux-device-home-$stamp.png"
  & $adb shell screencap -p $remoteScreenshot
  & $adb pull $remoteScreenshot $screenshot
  & $adb shell rm $remoteScreenshot
  & $adb logcat -d -t 2000 | Out-File -LiteralPath $logcat -Encoding utf8
  Write-Output "EVIDENCE_SCREENSHOT=$screenshot"
  Write-Output "EVIDENCE_LOGCAT=$logcat"
}

Write-Output "Instalação automática concluída apenas quando -Install foi informado."
Write-Output "A aprovação funcional depende do roteiro manual e das evidências; este script não a declara."
