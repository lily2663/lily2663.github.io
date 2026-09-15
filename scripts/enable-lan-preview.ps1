param(
  [ValidateRange(1, 65535)]
  [int]$Port = 1414,
  [switch]$Disable
)

$ruleName = "LilyMap Blog Preview (LAN $Port)"
$isAdministrator = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdministrator) {
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$PSCommandPath`"",
    '-Port', $Port
  )
  if ($Disable) { $arguments += '-Disable' }
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments
  exit
}

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($Disable) {
  if ($existing) {
    $existing | Remove-NetFirewallRule
    Write-Host "已关闭 LilyMap 手机预览防火墙规则。" -ForegroundColor Yellow
  } else {
    Write-Host "未发现需要移除的规则。"
  }
  exit
}

if ($existing) {
  $existing | Set-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -Profile Any
  $existing | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet
  $existing | Get-NetFirewallPortFilter | Set-NetFirewallPortFilter -Protocol TCP -LocalPort $Port
} else {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Description 'Allow LilyMap static blog preview from devices on the same local subnet only.' `
    -Enabled True `
    -Direction Inbound `
    -Action Allow `
    -Profile Any `
    -Protocol TCP `
    -LocalPort $Port `
    -RemoteAddress LocalSubnet | Out-Null
}

Write-Host "已允许同一局域网设备访问 TCP $Port。" -ForegroundColor Green
Write-Host "LilyMap 管理端 5174 未开放到局域网。"
