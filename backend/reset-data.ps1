# Reset the live JSON data from the sample seed files.
#
# Copies api/sample_*.json -> api/*.json and shifts all createdAt values so
# the newest record becomes "now". That keeps the dashboard's today/this-week
# counts meaningful no matter when you seed.
$ErrorActionPreference = 'Stop'

$apiDir = Join-Path $PSScriptRoot 'api'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Reset-FromSample([string] $sample, [string] $target) {
    $samplePath = Join-Path $apiDir $sample
    $targetPath = Join-Path $apiDir $target

    # Note: do NOT wrap the pipeline in @() - ConvertFrom-Json already returns
    # an array and @() would nest it (PowerShell 5.1 quirk).
    # Read as UTF-8 explicitly: PS 5.1 Get-Content defaults to the ANSI codepage
    # and would corrupt umlauts.
    $records = Get-Content -LiteralPath $samplePath -Raw -Encoding UTF8 |
        ConvertFrom-Json

    if (-not $records -or $records.Count -eq 0) {
        [System.IO.File]::WriteAllText($targetPath, '[]', $utf8)
        Write-Host "Reset $target (empty)"
        return
    }

    $newest = ($records |
        ForEach-Object { [datetimeoffset]::Parse($_.createdAt) } |
        Sort-Object -Descending)[0]
    $shift = [datetimeoffset]::UtcNow - $newest

    foreach ($record in $records) {
        $shifted = [datetimeoffset]::Parse($record.createdAt) + $shift
        $record.createdAt = $shifted.ToString('yyyy-MM-ddTHH:mm:sszzz')
    }

    $json = ConvertTo-Json -InputObject @($records) -Depth 8
    [System.IO.File]::WriteAllText($targetPath, $json, $utf8)

    Write-Host "Reset $target ($($records.Count) records)"
}

Reset-FromSample 'sample_messages.json' 'messages.json'
Reset-FromSample 'sample_projects.json' 'projects.json'
