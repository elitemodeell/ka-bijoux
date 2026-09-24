param(
  [string]$BackendRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

function Read-LocalEnv {
  param([string]$Path)
  $values = @{}
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
      if ($raw.StartsWith("\`$")) {
        $raw = $raw.Substring(1)
      }
      $values[$name] = $raw
    }
  }
  return $values
}

function Invoke-Asaas {
  param(
    [System.Net.Http.HttpClient]$Client,
    [System.Net.Http.HttpMethod]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $request = [System.Net.Http.HttpRequestMessage]::new(
    $Method,
    "https://api.asaas.com/v3$Path"
  )
  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 10 -Compress
      $request.Content = [System.Net.Http.StringContent]::new(
        $json,
        [System.Text.Encoding]::UTF8,
        "application/json"
      )
    }
    $response = $Client.SendAsync($request).GetAwaiter().GetResult()
    try {
      $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
      if (-not $response.IsSuccessStatusCode) {
        throw "Asaas respondeu HTTP $([int]$response.StatusCode)."
      }
      if (-not $content) {
        return $null
      }
      return $content | ConvertFrom-Json
    } finally {
      $response.Dispose()
    }
  } finally {
    $request.Dispose()
  }
}

function Normalize-Webhook {
  param([object]$Webhook)
  return [ordered]@{
    id = [string]$Webhook.id
    name = [string]$Webhook.name
    url = [string]$Webhook.url
    email = [string]$Webhook.email
    enabled = [bool]$Webhook.enabled
    interrupted = [bool]$Webhook.interrupted
    apiVersion = [int]$Webhook.apiVersion
    sendType = [string]$Webhook.sendType
    events = @($Webhook.events | Sort-Object)
  }
}

function Fingerprint-Webhook {
  param([object]$Webhook)
  $normalized = Normalize-Webhook -Webhook $Webhook
  return ($normalized | ConvertTo-Json -Depth 5 -Compress)
}

$env = Read-LocalEnv -Path (Join-Path $BackendRoot ".env.local")
$apiKey = [Environment]::GetEnvironmentVariable(
  "KA_BIJOUX_ASAAS_PRODUCTION_API_KEY",
  "Process"
)
if (-not $apiKey) {
  $secretPath = Join-Path `
    $env:USERPROFILE `
    ".codex\secrets\ka-bijoux\asaas-production-api-key.dpapi"
  if (Test-Path -LiteralPath $secretPath) {
    $secureKey = Get-Content -LiteralPath $secretPath -Raw |
      ConvertTo-SecureString
    $apiKey = [System.Net.NetworkCredential]::new("", $secureKey).Password
  }
}
$authToken = $env["ASAAS_WEBHOOK_TOKEN"]
if (-not $apiKey -or -not $apiKey.StartsWith('$aact_prod_')) {
  throw "ASAAS_API_KEY de produção indisponível."
}
if (-not $authToken -or $authToken.Length -lt 32 -or $authToken.Length -gt 255) {
  throw "ASAAS_WEBHOOK_TOKEN local inválido ou indisponível."
}

$targetName = "KA Bijoux Produção"
$expectedLegalName = $env["ASAAS_EXPECTED_LEGAL_NAME"]
$expectedCpfCnpj = ([string]$env["ASAAS_EXPECTED_CPF_CNPJ"]) -replace "\D", ""
$expectedWalletId = $env["ASAAS_EXPECTED_WALLET_ID"]
if (
  $expectedLegalName -ne "KABIJOUX LTDA" -or
  $expectedCpfCnpj.Length -ne 14 -or
  -not $expectedWalletId
) {
  throw "KA Bijoux expected financial identity is missing."
}

$targetUrl = "https://kabijoux.com.br/api/webhooks/asaas"
$events = @(
  "PAYMENT_CREATED",
  "PAYMENT_AWAITING_RISK_ANALYSIS",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUNDED"
)
$body = [ordered]@{
  name = $targetName
  url = $targetUrl
  email = "adm@kabijoux.com.br"
  enabled = $true
  interrupted = $false
  apiVersion = 3
  authToken = $authToken
  sendType = "SEQUENTIALLY"
  events = $events
}

$handler = [System.Net.Http.HttpClientHandler]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
try {
  $client.Timeout = [TimeSpan]::FromSeconds(30)
  $client.DefaultRequestHeaders.Add("access_token", $apiKey)
  $client.DefaultRequestHeaders.UserAgent.ParseAdd(
    "KA-Bijoux/1.0 (adm@kabijoux.com.br)"
  )
  $client.DefaultRequestHeaders.Accept.ParseAdd("application/json")

  $commercialInfo = Invoke-Asaas `
    -Client $client `
    -Method ([System.Net.Http.HttpMethod]::Get) `
    -Path "/myAccount/commercialInfo/"
  $walletResponse = Invoke-Asaas `
    -Client $client `
    -Method ([System.Net.Http.HttpMethod]::Get) `
    -Path "/wallets/"
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
    $actualDocument -ne $expectedCpfCnpj -or
    -not $walletMatch
  ) {
    throw "The credential does not belong to the expected KA Bijoux financial account. No webhook was changed."
  }

  $beforeResponse = Invoke-Asaas `
    -Client $client `
    -Method ([System.Net.Http.HttpMethod]::Get) `
    -Path "/webhooks?offset=0&limit=100"
  $before = @($beforeResponse.data)
  $candidates = @(
    $before | Where-Object {
      $_.name -eq $targetName -or $_.url -eq $targetUrl
    }
  )
  if ($candidates.Count -gt 1) {
    throw "Mais de um webhook candidato da KA Bijoux foi encontrado."
  }

  $otherBefore = @{}
  foreach ($webhook in $before) {
    if ($candidates.Count -eq 1 -and $webhook.id -eq $candidates[0].id) {
      continue
    }
    $otherBefore[[string]$webhook.id] = Fingerprint-Webhook -Webhook $webhook
  }

  $operation = if ($candidates.Count -eq 1) { "updated" } else { "created" }
  $saved = if ($operation -eq "updated") {
    Invoke-Asaas `
      -Client $client `
      -Method ([System.Net.Http.HttpMethod]::Put) `
      -Path "/webhooks/$([Uri]::EscapeDataString([string]$candidates[0].id))" `
      -Body $body
  } else {
    Invoke-Asaas `
      -Client $client `
      -Method ([System.Net.Http.HttpMethod]::Post) `
      -Path "/webhooks" `
      -Body $body
  }
  if (-not $saved.id) {
    throw "Asaas não retornou o identificador do webhook salvo."
  }

  $verified = Invoke-Asaas `
    -Client $client `
    -Method ([System.Net.Http.HttpMethod]::Get) `
    -Path "/webhooks/$([Uri]::EscapeDataString([string]$saved.id))"
  $afterResponse = Invoke-Asaas `
    -Client $client `
    -Method ([System.Net.Http.HttpMethod]::Get) `
    -Path "/webhooks?offset=0&limit=100"
  $after = @($afterResponse.data)

  $otherAfter = @{}
  foreach ($webhook in $after) {
    if ($webhook.id -eq $saved.id) {
      continue
    }
    $otherAfter[[string]$webhook.id] = Fingerprint-Webhook -Webhook $webhook
  }
  $othersPreserved = $otherBefore.Count -eq $otherAfter.Count
  if ($othersPreserved) {
    foreach ($id in $otherBefore.Keys) {
      if (
        -not $otherAfter.ContainsKey($id) -or
        $otherAfter[$id] -ne $otherBefore[$id]
      ) {
        $othersPreserved = $false
        break
      }
    }
  }

  $verifiedEvents = @($verified.events | Sort-Object)
  $expectedEvents = @($events | Sort-Object)
  $eventsMatch =
    $verifiedEvents.Count -eq $expectedEvents.Count -and
    (@(Compare-Object $verifiedEvents $expectedEvents).Count -eq 0)
  $fieldsMatch =
    $verified.name -eq $targetName -and
    $verified.url -eq $targetUrl -and
    $verified.email -eq "adm@kabijoux.com.br" -and
    [bool]$verified.enabled -and
    -not [bool]$verified.interrupted -and
    [int]$verified.apiVersion -eq 3 -and
    $verified.sendType -eq "SEQUENTIALLY" -and
    $eventsMatch

  Write-Output "WEBHOOK_OPERATION=$operation"
  Write-Output "WEBHOOK_CREATED_OR_UPDATED=true"
  Write-Output "WEBHOOK_FIELDS_MATCH=$fieldsMatch"
  Write-Output "WEBHOOK_EVENTS_MATCH=$eventsMatch"
  Write-Output "WEBHOOK_ENABLED=$([bool]$verified.enabled)"
  Write-Output "WEBHOOK_QUEUE_ACTIVE=$(-not [bool]$verified.interrupted)"
  Write-Output "OTHER_WEBHOOKS_PRESERVED=$othersPreserved"
  Write-Output "AUTH_TOKEN_SOURCE_MATCH=true"
  Write-Output "OTHER_WEBHOOK_COUNT=$($otherAfter.Count)"

  if (-not $fieldsMatch -or -not $othersPreserved) {
    throw "A validação final do webhook falhou."
  }
} finally {
  $client.Dispose()
  $handler.Dispose()
}
