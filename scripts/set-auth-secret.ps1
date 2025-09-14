# Usage:
#   powershell -ExecutionPolicy Bypass -File ./scripts/set-auth-secret.ps1 -Secret "<value>" -EnvFile ".env.development.local"
#   powershell -ExecutionPolicy Bypass -File ./scripts/set-auth-secret.ps1 -Generate -EnvFile ".env.production.local"

param(
  [switch]$Generate,
  [string]$Secret,
  [string]$EnvFile = ".env.development.local"
)

if (-not $Generate -and [string]::IsNullOrWhiteSpace($Secret)) {
  Write-Error "Provide -Generate or -Secret <value>"
  exit 1
}

if ($Generate) {
  $bytes = New-Object Byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $Secret = [Convert]::ToBase64String($bytes)
}

if (Test-Path $EnvFile) {
  (Get-Content $EnvFile | Where-Object {$_ -notmatch '^AUTH_SECRET='}) | Set-Content $EnvFile
  Add-Content $EnvFile "AUTH_SECRET=$Secret"
} else {
  Set-Content -Path $EnvFile -Value "AUTH_SECRET=$Secret"
}

Write-Output "AUTH_SECRET set in $EnvFile"


