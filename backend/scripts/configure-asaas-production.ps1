param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $result
  }
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$") {
      $name = $Matches[1]
      $raw = $Matches[2].Trim()
      if (
        ($raw.StartsWith('"') -and $raw.EndsWith('"')) -or
        ($raw.StartsWith("'") -and $raw.EndsWith("'"))
      ) {
        $raw = $raw.Substring(1, $raw.Length - 2)
      }
      $result[$name] = $raw
    }
  }
  return $result
}

function Set-EnvFileValues {
  param(
    [string]$Path,
    [hashtable]$Values
  )

  $lines = [System.Collections.Generic.List[string]]::new()
  if (Test-Path -LiteralPath $Path) {
    foreach ($existingLine in [System.IO.File]::ReadAllLines($Path)) {
      $lines.Add($existingLine)
    }
  }

  foreach ($entry in $Values.GetEnumerator()) {
    $replacement = "$($entry.Key)=$($entry.Value)"
    $found = $false
    for ($index = 0; $index -lt $lines.Count; $index++) {
      if ($lines[$index] -match "^\s*$([regex]::Escape($entry.Key))\s*=") {
        $lines[$index] = $replacement
        $found = $true
        break
      }
    }
    if (-not $found) {
      $lines.Add($replacement)
    }
  }

  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllLines($Path, $lines, $encoding)
}

function New-SecureToken {
  $bytes = [byte[]]::new(48)
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($bytes).
    TrimEnd("=").
    Replace("+", "-").
    Replace("/", "_")
}

function Read-SharedTextFile {
  param([string]$Path)
  $stream = [System.IO.FileStream]::new(
    $Path,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::ReadWrite
  )
  try {
    $reader = [System.IO.StreamReader]::new($stream)
    try {
      return $reader.ReadToEnd()
    } finally {
      $reader.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

function Set-VercelEnvironmentVariable {
  param(
    [string]$Name,
    [ValidateSet("production", "preview", "development")]
    [string]$Target,
    [string]$Value
  )

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = "cmd.exe"
  $startInfo.Arguments = "/d /s /c vercel env add $Name $Target --force --yes"
  $startInfo.WorkingDirectory = (Join-Path $WorkspaceRoot "backend")
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  [void]$process.Start()
  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()
  $null = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw "Falha ao configurar $Name em $Target na Vercel. $errorOutput"
  }
}

$backendRoot = Join-Path $WorkspaceRoot "backend"
$envLocalPath = Join-Path $backendRoot ".env.local"
$envExamplePath = Join-Path $backendRoot ".env.example"
$backendGitignorePath = Join-Path $backendRoot ".gitignore"

if (-not (Test-Path -LiteralPath $backendGitignorePath)) {
  throw "backend/.gitignore não encontrado."
}
$gitignoreProtected = [System.IO.File]::ReadAllLines($backendGitignorePath) |
  Where-Object { $_ -match "^\s*\.env\*\.local\s*$|^\s*\.env\.local\s*$" }
if (-not $gitignoreProtected) {
  throw "backend/.env.local não está protegido pelo .gitignore."
}

$officialApiKey = [Environment]::GetEnvironmentVariable(
  "KA_BIJOUX_ASAAS_PRODUCTION_API_KEY",
  "Process"
)
$expectedCpfCnpj = [Environment]::GetEnvironmentVariable(
  "KA_BIJOUX_ASAAS_EXPECTED_CPF_CNPJ",
  "Process"
)
$expectedWalletId = [Environment]::GetEnvironmentVariable(
  "KA_BIJOUX_ASAAS_EXPECTED_WALLET_ID",
  "Process"
)
$expectedLegalName = "KABIJOUX LTDA"
if (-not $officialApiKey -or -not $expectedCpfCnpj -or -not $expectedWalletId) {
  throw "Official KA Bijoux Asaas identity is missing from the process-only variables."
}

$productionApiKey = $officialApiKey
if (
  -not $productionApiKey.StartsWith('$aact_prod_') -or
  $productionApiKey.Length -lt 80
) {
  throw "A credencial autorizada não possui formato de produção válido."
}

if ($productionApiKey -cne $officialApiKey) {
  throw "The discovered credential is not the explicitly supplied KA Bijoux credential. No configuration was changed."
}
$normalizedExpectedDocument = $expectedCpfCnpj -replace "\D", ""
if ($normalizedExpectedDocument.Length -ne 14) {
  throw "The expected KA Bijoux CNPJ must contain 14 digits."
}
$identityHeaders = @{
  "access_token" = $productionApiKey
  "Accept" = "application/json"
  "User-Agent" = "KA-Bijoux/financial-account-verification"
}
$commercialInfo = Invoke-RestMethod `
  -Method Get `
  -Uri "https://api.asaas.com/v3/myAccount/commercialInfo/" `
  -Headers $identityHeaders
$walletResponse = Invoke-RestMethod `
  -Method Get `
  -Uri "https://api.asaas.com/v3/wallets/" `
  -Headers $identityHeaders
$actualDocument = ([string]$commercialInfo.cpfCnpj) -replace "\D", ""
$actualName = ([string]$commercialInfo.companyName).Trim().ToUpperInvariant()
$wallets = if ($walletResponse.data) { @($walletResponse.data) } else { @($walletResponse) }
$walletMatch = @(
  $wallets | Where-Object {
    [string]$(if ($_.id) { $_.id } else { $_.walletId }) -eq $expectedWalletId
  }
).Count -eq 1
if (
  $actualName -ne $expectedLegalName -or
  $actualDocument -ne $normalizedExpectedDocument -or
  -not $walletMatch
) {
  throw "The credential does not belong to the expected KA Bijoux financial account. No configuration was changed."
}

$secretDirectory = Join-Path $env:USERPROFILE ".codex\secrets\ka-bijoux"
$secretPath = Join-Path $secretDirectory "asaas-production-api-key.dpapi"
New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
$productionApiKey |
  ConvertTo-SecureString -AsPlainText -Force |
  ConvertFrom-SecureString |
  Set-Content -LiteralPath $secretPath -Encoding ascii -NoNewline
$secureBackup = Get-Content -LiteralPath $secretPath -Raw | ConvertTo-SecureString
$backupRoundTrip = [System.Net.NetworkCredential]::new("", $secureBackup).Password
if ($backupRoundTrip -cne $productionApiKey) {
  throw "The DPAPI backup could not be validated. No remote configuration was changed."
}

$example = Read-EnvFile -Path $envExamplePath
$requiredDefaults = @(
  "ASAAS_PIX_ENABLED",
  "ASAAS_CREDIT_CARD_ENABLED",
  "ASAAS_BOLETO_ENABLED",
  "ASAAS_MAX_INSTALLMENTS",
  "PAYMENT_PIX_DUE_DAYS",
  "PAYMENT_BOLETO_DUE_DAYS",
  "PAYMENT_CHECKOUT_EXPIRATION_MINUTES",
  "PAYMENT_CHECKOUT_RETURN_URL"
)
foreach ($name in $requiredDefaults) {
  if (-not $example[$name]) {
    throw "$name não possui regra comercial confirmada em .env.example."
  }
}

$returnUrl = [Uri]$example["PAYMENT_CHECKOUT_RETURN_URL"]
if ($returnUrl.Scheme -ne "https" -or $returnUrl.Host -ne "kabijoux.com.br") {
  throw "PAYMENT_CHECKOUT_RETURN_URL não corresponde ao domínio HTTPS oficial."
}

$productionWebhookToken = New-SecureToken

$sharedProduction = @{
  PAYMENT_DEFAULT_PROVIDER = "ASAAS"
  ASAAS_ENVIRONMENT = "production"
  ASAAS_EXPECTED_LEGAL_NAME = $expectedLegalName
  ASAAS_EXPECTED_CPF_CNPJ = $normalizedExpectedDocument
  ASAAS_EXPECTED_WALLET_ID = $expectedWalletId
  ASAAS_PIX_ENABLED = $example["ASAAS_PIX_ENABLED"]
  ASAAS_CREDIT_CARD_ENABLED = $example["ASAAS_CREDIT_CARD_ENABLED"]
  ASAAS_BOLETO_ENABLED = $example["ASAAS_BOLETO_ENABLED"]
  ASAAS_MAX_INSTALLMENTS = $example["ASAAS_MAX_INSTALLMENTS"]
  PAYMENT_PIX_DUE_DAYS = $example["PAYMENT_PIX_DUE_DAYS"]
  PAYMENT_BOLETO_DUE_DAYS = $example["PAYMENT_BOLETO_DUE_DAYS"]
  PAYMENT_CHECKOUT_EXPIRATION_MINUTES = $example["PAYMENT_CHECKOUT_EXPIRATION_MINUTES"]
  PAYMENT_CHECKOUT_RETURN_URL = $example["PAYMENT_CHECKOUT_RETURN_URL"]
}

$localValues = @{}
foreach ($entry in $sharedProduction.GetEnumerator()) {
  $localValues[$entry.Key] = $entry.Value
}
# A API Key não é persistida em texto simples no workspace. Ela permanece na
# Vercel e no backup DPAPI criado para o usuário do Windows.
$localValues["ASAAS_WEBHOOK_TOKEN"] = $productionWebhookToken
Set-EnvFileValues -Path $envLocalPath -Values $localValues

$productionValues = @{}
foreach ($entry in $sharedProduction.GetEnumerator()) {
  $productionValues[$entry.Key] = $entry.Value
}
$productionValues["ASAAS_API_KEY"] = $productionApiKey
$productionValues["ASAAS_WEBHOOK_TOKEN"] = $productionWebhookToken

foreach ($entry in $productionValues.GetEnumerator()) {
  Set-VercelEnvironmentVariable -Name $entry.Key -Target "production" -Value $entry.Value
}
& (Join-Path $PSScriptRoot "configure-asaas-nonproduction.ps1") `
  -WorkspaceRoot $WorkspaceRoot

Write-Output "LOCAL_ENV_CONFIGURED=true"
Write-Output "PRODUCTION_CONFIGURED=true"
Write-Output "PREVIEW_SAFE_CONFIGURED=true"
Write-Output "DEVELOPMENT_SAFE_CONFIGURED=true"
Write-Output "PRODUCTION_WEBHOOK_TOKEN_CONFIGURED=true"
Write-Output "PRODUCTION_API_KEY_CONFIGURED=true"
Write-Output "PRODUCTION_API_KEY_DPAPI_BACKUP_VALIDATED=true"
Write-Output "ASAAS_BASE_URL_SKIPPED_AS_UNUSED=true"
