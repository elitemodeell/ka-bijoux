param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$resolvedArtifact = (Resolve-Path -LiteralPath $ArtifactPath).Path
$artifactHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedArtifact).Hash
$ImageExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')
$VideoExtensions = @('.mp4', '.webm', '.mov', '.m4v', '.avi')
$ForbiddenPatterns = @(
    'sex[-_ ]?shop',
    'ka[-_ ]?intima',
    'vibrador',
    'sugador',
    'masturbador',
    'plug[-_ ]?anal',
    'brinquedo[-_ ]?sexual',
    'bdsm',
    '/categoria/sex-shop',
    '/produtos\?category=sex-shop'
)
$SecretPatterns = @(
    'resend_api_key\s*[:=]',
    'asaas_api_key\s*[:=]',
    'supabase_service_role',
    'database_url\s*[:=]',
    '-----begin [a-z ]*private key-----',
    '\$aact_[a-z0-9_$:-]{20,}'
)

$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedArtifact)
try {
    $entries = @($archive.Entries | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) })
    $findings = [System.Collections.Generic.List[string]]::new()
    $secretFindings = [System.Collections.Generic.List[string]]::new()
    $imageCount = 0
    $videoCount = 0

    foreach ($entry in $entries) {
        $relative = $entry.FullName.Replace('\', '/')
        $extension = [System.IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
        $normalizedName = $relative.ToLowerInvariant()

        if ($normalizedName -match '(^|/)seed(s)?([./_-]|$)') {
            $findings.Add("seed:$relative")
        }

        foreach ($pattern in $ForbiddenPatterns) {
            if ($normalizedName -match $pattern) {
                $findings.Add("name:$relative")
                break
            }
        }

        if ($extension -in $ImageExtensions) {
            $imageCount++
            continue
        }
        if ($extension -in $VideoExtensions) {
            $videoCount++
            continue
        }

        if ($entry.Length -le 100MB) {
            $stream = $entry.Open()
            try {
                $memory = [System.IO.MemoryStream]::new()
                try {
                    $stream.CopyTo($memory)
                    $content = [System.Text.Encoding]::UTF8.GetString($memory.ToArray()).ToLowerInvariant()
                    foreach ($pattern in $ForbiddenPatterns) {
                        if ($content -match $pattern) {
                            $findings.Add("content:$relative")
                            break
                        }
                    }
                    for ($secretPatternIndex = 0; $secretPatternIndex -lt $SecretPatterns.Count; $secretPatternIndex++) {
                        if ($content -match $SecretPatterns[$secretPatternIndex]) {
                            $secretFindings.Add("secret-pattern-$secretPatternIndex`:$relative")
                            break
                        }
                    }
                }
                finally {
                    $memory.Dispose()
                }
            }
            finally {
                $stream.Dispose()
            }
        }
    }

    if ($findings.Count -gt 0) {
        throw "Artefato bloqueado: $($findings.Count) ocorrência(s) incompatível(is) encontrada(s)."
    }
    if ($secretFindings.Count -gt 0) {
        throw "Artefato bloqueado: $($secretFindings.Count) possível(is) segredo(s) encontrado(s) em: $($secretFindings -join ', ')."
    }

    [pscustomobject]@{
        Artifact = $resolvedArtifact
        Sha256 = $artifactHash
        FileCount = $entries.Count
        ImageCount = $imageCount
        VideoCount = $videoCount
        SeedCount = 0
        ForbiddenFindingCount = 0
        SecretFindingCount = 0
        Result = 'APPROVED_STATIC_SCAN'
    } | Format-List
}
finally {
    $archive.Dispose()
}
