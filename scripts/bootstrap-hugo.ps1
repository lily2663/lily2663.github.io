[CmdletBinding()]
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$version = '0.165.0'
$root = Split-Path -Parent $PSScriptRoot
$targetDir = Join-Path $root ".tools\hugo-$version"
$targetExe = Join-Path $targetDir 'hugo.exe'

if ((Test-Path -LiteralPath $targetExe) -and -not $Force) {
  Write-Output "Hugo $version is already available at $targetExe"
  exit 0
}

$asset = "hugo_${version}_windows-amd64.zip"
$baseUrl = "https://github.com/gohugoio/hugo/releases/download/v$version"
$downloadDir = Join-Path $root '.tools\downloads'
$archive = Join-Path $downloadDir $asset
$checksums = Join-Path $downloadDir "hugo_${version}_checksums.txt"
$extractDir = Join-Path $downloadDir "hugo-$version-extract"

New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null

$proxy = $env:LILY_HUGO_PROXY
if (-not $proxy -and (Get-Command git -ErrorAction SilentlyContinue)) {
  $proxy = (& git config --global --get https.proxy 2>$null | Select-Object -First 1)
}

$request = @{ UseBasicParsing = $true }
if ($proxy) {
  $request.Proxy = $proxy.Trim()
}

Write-Output "Downloading Hugo $version from the official release."
Invoke-WebRequest @request -Uri "$baseUrl/$asset" -OutFile $archive
Invoke-WebRequest @request -Uri "$baseUrl/hugo_${version}_checksums.txt" -OutFile $checksums

$checksumLine = Get-Content -LiteralPath $checksums | Where-Object { $_ -match "\s$([regex]::Escape($asset))$" } | Select-Object -First 1
if (-not $checksumLine) {
  throw "The official checksum file does not contain $asset."
}

$expectedHash = ($checksumLine -split '\s+')[0].ToUpperInvariant()
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToUpperInvariant()
if ($actualHash -ne $expectedHash) {
  throw "Hugo archive checksum mismatch. Expected $expectedHash, got $actualHash."
}

if (Test-Path -LiteralPath $extractDir) {
  Remove-Item -LiteralPath $extractDir -Recurse -Force
}
Expand-Archive -LiteralPath $archive -DestinationPath $extractDir -Force
$downloadedExe = Get-ChildItem -LiteralPath $extractDir -Recurse -Filter hugo.exe | Select-Object -First 1
if (-not $downloadedExe) {
  throw 'The official Hugo archive did not contain hugo.exe.'
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Copy-Item -LiteralPath $downloadedExe.FullName -Destination $targetExe -Force
Write-Output "Installed verified Hugo $version at $targetExe"
