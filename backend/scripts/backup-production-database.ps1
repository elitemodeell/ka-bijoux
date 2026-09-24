param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not $env:DIRECT_URL) {
  throw "DIRECT_URL não está disponível no processo."
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $resolvedOutput) {
  throw "O arquivo de backup já existe; nenhuma sobrescrita foi realizada."
}

$parent = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $parent)) {
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

& pg_dump `
  --dbname=$env:DIRECT_URL `
  --format=custom `
  --compress=9 `
  --no-owner `
  --no-privileges `
  --file=$resolvedOutput

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump falhou."
}

& pg_restore --list $resolvedOutput | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "O arquivo criado não passou na validação do pg_restore."
}

$backup = Get-Item -LiteralPath $resolvedOutput
if ($backup.Length -le 0) {
  throw "O arquivo de backup está vazio."
}

Write-Output "BACKUP_CREATED=True"
Write-Output "BACKUP_VALIDATED=True"
Write-Output "BACKUP_NONEMPTY=True"
