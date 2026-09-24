param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)
  $result = @{}
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$") {
      $name = $Matches[1]
      $raw = $Matches[2].Trim().Trim('"').Trim("'")
      $result[$name] = $raw
    }
  }
  return $result
}

function Set-SafeVercelValue {
  param(
    [string]$Name,
    [ValidateSet("preview", "development")]
    [string]$Target,
    [string]$Value
  )

  if ($Name -match "KEY|SECRET|TOKEN|PASSWORD") {
    throw "Variável secreta não permitida no configurador não produtivo."
  }
  if ($Value -match "\s") {
    throw "Valor não secreto inesperado."
  }

  $authPath = Join-Path $env:APPDATA "com.vercel.cli\Data\auth.json"
  $projectPath = Join-Path $WorkspaceRoot ".vercel\project.json"
  $auth = Get-Content -LiteralPath $authPath -Raw | ConvertFrom-Json
  $project = Get-Content -LiteralPath $projectPath -Raw | ConvertFrom-Json
  if (-not $auth.token -or -not $project.projectId -or -not $project.orgId) {
    throw "Autenticação ou vínculo da Vercel indisponível."
  }

  $headers = @{
    Authorization = "Bearer $($auth.token)"
    "Content-Type" = "application/json"
  }
  $body = @{
    type = if ($Target -eq "preview") { "sensitive" } else { "encrypted" }
    key = $Name
    value = $Value
    target = @($Target)
  } | ConvertTo-Json -Compress
  $uri =
    "https://api.vercel.com/v10/projects/$($project.projectId)/env" +
    "?upsert=true&teamId=$([Uri]::EscapeDataString($project.orgId))"
  $null = Invoke-RestMethod `
    -Method Post `
    -Uri $uri `
    -Headers $headers `
    -Body $body
}

$example = Read-EnvFile -Path (Join-Path $WorkspaceRoot "backend\.env.example")
$safeValues = @{
  PAYMENT_DEFAULT_PROVIDER = "ASAAS"
  ASAAS_ENVIRONMENT = "sandbox"
  ASAAS_PIX_ENABLED = "false"
  ASAAS_CREDIT_CARD_ENABLED = "false"
  ASAAS_BOLETO_ENABLED = "false"
  ASAAS_MAX_INSTALLMENTS = $example["ASAAS_MAX_INSTALLMENTS"]
  PAYMENT_PIX_DUE_DAYS = $example["PAYMENT_PIX_DUE_DAYS"]
  PAYMENT_BOLETO_DUE_DAYS = $example["PAYMENT_BOLETO_DUE_DAYS"]
  PAYMENT_CHECKOUT_EXPIRATION_MINUTES = $example["PAYMENT_CHECKOUT_EXPIRATION_MINUTES"]
  PAYMENT_CHECKOUT_RETURN_URL = $example["PAYMENT_CHECKOUT_RETURN_URL"]
}

foreach ($entry in $safeValues.GetEnumerator()) {
  if (-not $entry.Value) {
    throw "Configuração confirmada ausente: $($entry.Key)."
  }
}

foreach ($target in @("preview", "development")) {
  foreach ($entry in $safeValues.GetEnumerator()) {
    Set-SafeVercelValue `
      -Name $entry.Key `
      -Target $target `
      -Value $entry.Value
  }
}

Write-Output "PREVIEW_SAFE_CONFIGURED=true"
Write-Output "DEVELOPMENT_SAFE_CONFIGURED=true"
Write-Output "NONPRODUCTION_PRODUCTION_KEY_CONFIGURED=false"
Write-Output "NONPRODUCTION_WEBHOOK_TOKEN_CONFIGURED=false"
