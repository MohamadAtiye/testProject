# Setup: download a self-contained llama.cpp Windows CPU build (llama-server)
# into backend/tools/llama.cpp. Idempotent - safe to run repeatedly.
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$toolsDir = Join-Path $root 'tools\llama.cpp'
$serverExe = Join-Path $toolsDir 'llama-server.exe'

if (Test-Path -LiteralPath $serverExe) {
    Write-Host "llama-server already installed: $serverExe"
    exit 0
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$headers = @{ 'User-Agent' = 'opencode-setup' }
Write-Host 'Looking up the latest llama.cpp release...'

$releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=15' -Headers $headers
$asset = $null
foreach ($rel in $releases) {
    $candidate = $rel.assets | Where-Object { $_.name -match 'bin-win-cpu-x64\.zip$' } | Select-Object -First 1
    if ($candidate) { $asset = $candidate; break }
}

if (-not $asset) {
    throw 'Could not find a Windows CPU build (win-cpu-x64) in the recent releases.'
}

$zipPath = Join-Path $env:TEMP $asset.name
Write-Host "Downloading $($asset.name) ($([math]::Round($asset.size / 1MB, 1)) MB)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -Headers $headers

Write-Host "Extracting to $toolsDir ..."
Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
Remove-Item -LiteralPath $zipPath -Force

Write-Host 'Done.'
Write-Host "Installed: $serverExe"
