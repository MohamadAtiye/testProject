# Setup: download a self-contained llama.cpp Windows build (llama-server)
# into backend/tools/llama.cpp.
#
# By default this installs the CUDA 12.4 x64 build plus its runtime DLLs so the
# model runs on an NVIDIA GPU. Pass -Cpu for a CPU-only build.
# Idempotent - safe to run repeatedly.
param(
    [switch]$Cpu
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$toolsDir = Join-Path $root 'tools\llama.cpp'
$serverExe = Join-Path $toolsDir 'llama-server.exe'
$cudaMarker = Join-Path $toolsDir 'ggml-cuda.dll'

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

# Only treat the install as done when the requested backend is present, so an
# existing CPU install gets replaced by the CUDA build (and vice versa).
$installed = (Test-Path -LiteralPath $serverExe) -and ($Cpu -or (Test-Path -LiteralPath $cudaMarker))
if ($installed) {
    Write-Host "llama-server already installed: $serverExe"
    exit 0
}

$headers = @{ 'User-Agent' = 'opencode-setup' }
Write-Host 'Looking up the latest llama.cpp release...'

$releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=15' -Headers $headers

if ($Cpu) {
    $binPattern = '^llama-.*bin-win-cpu-x64\.zip$'
    $cudartPattern = $null
} else {
    $binPattern = '^llama-.*bin-win-cuda-12\.4-x64\.zip$'
    $cudartPattern = '^cudart-.*bin-win-cuda-12\.4-x64\.zip$'
}

$binAsset = $null
$cudartAsset = $null
foreach ($rel in $releases) {
    $candidate = $rel.assets | Where-Object { $_.name -match $binPattern } | Select-Object -First 1
    if ($candidate) {
        $binAsset = $candidate
        if ($cudartPattern) {
            $cudartAsset = $rel.assets | Where-Object { $_.name -match $cudartPattern } | Select-Object -First 1
        }
        break
    }
}

if (-not $binAsset) {
    throw 'Could not find a matching Windows build in the recent releases.'
}

function Get-Asset([object]$Asset, [string]$Destination) {
    $zipPath = Join-Path $env:TEMP $Asset.name
    Write-Host "Downloading $($Asset.name) ($([math]::Round($Asset.size / 1MB, 1)) MB)..."
    Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $zipPath -Headers $headers
    Write-Host "Extracting to $Destination ..."
    Expand-Archive -Path $zipPath -DestinationPath $Destination -Force
    Remove-Item -LiteralPath $zipPath -Force
}

Get-Asset $binAsset $toolsDir

if ($cudartAsset) {
    Get-Asset $cudartAsset $toolsDir
} elseif (-not $Cpu) {
    Write-Warning 'CUDA runtime package not found in the release; the server may fail to start without the CUDA DLLs.'
}

Write-Host 'Done.'
Write-Host "Installed: $serverExe"
