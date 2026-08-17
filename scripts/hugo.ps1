param([Parameter(ValueFromRemainingArguments = $true)][string[]]$HugoArgs)

$root = Split-Path -Parent $PSScriptRoot
$hugo = Join-Path $root '.tools\hugo-0.165.0\hugo.exe'
if (-not (Test-Path -LiteralPath $hugo)) {
  throw "Hugo 0.165.0 is missing. Run the local tool bootstrap first."
}

$cache = Join-Path $root '.cache\hugo'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
& $hugo @HugoArgs --cacheDir $cache
exit $LASTEXITCODE
