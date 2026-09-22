param([Parameter(ValueFromRemainingArguments = $true)][string[]]$HugoArgs)

$root = Split-Path -Parent $PSScriptRoot
$hugo = $env:LILY_HUGO_PATH
if ($hugo) {
  if (-not (Test-Path -LiteralPath $hugo)) {
    throw "LILY_HUGO_PATH does not exist: $hugo"
  }
} else {
  $hugo = Join-Path $root '.tools\hugo-0.165.0\hugo.exe'
  if (-not (Test-Path -LiteralPath $hugo)) {
    & (Join-Path $PSScriptRoot 'bootstrap-hugo.ps1')
  }
  if (-not (Test-Path -LiteralPath $hugo)) {
    throw "Hugo 0.165.0 could not be bootstrapped. Set LILY_HUGO_PATH to a valid hugo.exe."
  }
}

$cache = Join-Path $root '.cache\hugo'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
& $hugo @HugoArgs --cacheDir $cache
exit $LASTEXITCODE
