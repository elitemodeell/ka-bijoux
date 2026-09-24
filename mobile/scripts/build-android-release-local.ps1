param(
    [ValidateSet('bundle', 'apk', 'all')]
    [string]$Task = 'all',

    [ValidateSet('all', 'arm64-v8a')]
    [string]$Architectures = 'all'
)

$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $mobileRoot 'android'
$credentialsPath = Join-Path $mobileRoot 'credentials.json'

if (-not (Test-Path -LiteralPath $credentialsPath)) {
    throw 'mobile/credentials.json is missing. Download the existing production credential with eas credentials -p android.'
}

$credentials = Get-Content -Raw -LiteralPath $credentialsPath | ConvertFrom-Json
$keystoreRelativePath = [string]$credentials.android.keystore.keystorePath
$keystorePath = Join-Path $mobileRoot $keystoreRelativePath

if (-not (Test-Path -LiteralPath $keystorePath)) {
    throw 'The upload keystore referenced by mobile/credentials.json is missing.'
}

$requiredCredentialValues = @{
    KA_BIJOUX_UPLOAD_STORE_FILE = $keystorePath
    KA_BIJOUX_UPLOAD_KEY_ALIAS = [string]$credentials.android.keystore.keyAlias
    KA_BIJOUX_UPLOAD_STORE_PASSWORD = [string]$credentials.android.keystore.keystorePassword
    KA_BIJOUX_UPLOAD_KEY_PASSWORD = [string]$credentials.android.keystore.keyPassword
}

$missingCredentialNames = @(
    $requiredCredentialValues.GetEnumerator() |
        Where-Object { [string]::IsNullOrWhiteSpace([string]$_.Value) } |
        ForEach-Object { $_.Key }
)

if ($missingCredentialNames.Count -gt 0) {
    throw "Required Android credential fields are missing: $($missingCredentialNames -join ', ')"
}

$defaultJavaHome = 'C:\Program Files\Android\Android Studio\jbr'
$defaultAndroidHome = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath $defaultJavaHome)) {
    $env:JAVA_HOME = $defaultJavaHome
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath $defaultAndroidHome)) {
    $env:ANDROID_HOME = $defaultAndroidHome
}
if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw 'JAVA_HOME must point to a compatible JDK. Android Studio JBR 21 is supported by this project.'
}
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
    throw 'ANDROID_HOME must point to the installed Android SDK.'
}

$nodeVersionText = (& node --version).TrimStart('v')
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion -lt [version]'20.19.4') {
    throw "Node 20.19.4 or newer is required. Current version: $nodeVersionText"
}

$gradleTasks = switch ($Task) {
    'bundle' { @('app:bundleRelease') }
    'apk' { @('app:assembleRelease') }
    'all' { @('app:bundleRelease', 'app:assembleRelease') }
}

$env:KA_BIJOUX_UPLOAD_STORE_FILE = $requiredCredentialValues.KA_BIJOUX_UPLOAD_STORE_FILE
$env:KA_BIJOUX_UPLOAD_KEY_ALIAS = $requiredCredentialValues.KA_BIJOUX_UPLOAD_KEY_ALIAS
$env:KA_BIJOUX_UPLOAD_STORE_PASSWORD = $requiredCredentialValues.KA_BIJOUX_UPLOAD_STORE_PASSWORD
$env:KA_BIJOUX_UPLOAD_KEY_PASSWORD = $requiredCredentialValues.KA_BIJOUX_UPLOAD_KEY_PASSWORD
$env:NODE_ENV = 'production'

try {
    Push-Location $androidRoot
    try {
        foreach ($gradleTask in $gradleTasks) {
            # Release builds must not reuse a stale IDE/previous-build daemon.
            # A dedicated daemon is stopped automatically at the end of this invocation.
            $arguments = @($gradleTask, '--console=plain', '--no-daemon')
            if ($Architectures -ne 'all') {
                $arguments += "-PreactNativeArchitectures=$Architectures"
            }

            $ErrorActionPreference = 'Continue'
            & .\gradlew.bat @arguments
            $gradleExitCode = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'

            if ($gradleExitCode -ne 0) {
                throw "Gradle task $gradleTask failed with exit code $gradleExitCode."
            }
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:KA_BIJOUX_UPLOAD_STORE_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:KA_BIJOUX_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:KA_BIJOUX_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:KA_BIJOUX_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
}

$appConfig = Get-Content -Raw -LiteralPath (Join-Path $mobileRoot 'app.json') | ConvertFrom-Json
$versionName = [string]$appConfig.expo.version
$versionCode = [int]$appConfig.expo.android.versionCode
$artifactRoot = Join-Path (Split-Path -Parent $mobileRoot) 'artifacts\android\release'
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null

if ($Task -in @('bundle', 'all')) {
    $bundleSource = Join-Path $androidRoot 'app\build\outputs\bundle\release\app-release.aab'
    $bundleTarget = Join-Path $artifactRoot "KA-Bijoux-$versionName-vc$versionCode-google-play.aab"
    Copy-Item -LiteralPath $bundleSource -Destination $bundleTarget -Force
    Write-Output "AAB copied to $bundleTarget"
}

if ($Task -in @('apk', 'all')) {
    $apkSource = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
    $apkTarget = Join-Path $artifactRoot "KA-Bijoux-$versionName-vc$versionCode-release.apk"
    Copy-Item -LiteralPath $apkSource -Destination $apkTarget -Force
    Write-Output "APK copied to $apkTarget"
}
