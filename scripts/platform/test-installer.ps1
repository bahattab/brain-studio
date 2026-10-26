param([string]$ArtifactDirectory = (Join-Path $PSScriptRoot '../../dist/native'))
$ErrorActionPreference = 'Stop'
if (-not $env:CI) { throw 'Installer automation is limited to an isolated CI machine.' }
$resolvedArtifacts = (Resolve-Path -LiteralPath $ArtifactDirectory).Path
$installers = @(Get-ChildItem -LiteralPath $resolvedArtifacts -Filter '*-win-x64.exe' -File)
if ($installers.Count -ne 1) { throw 'Expected exactly one NSIS installer.' }
$testRoot = Join-Path $env:RUNNER_TEMP ('brain-studio-install-' + [guid]::NewGuid().ToString('N'))
$installDirectory = Join-Path $testRoot 'Chosen Folder'
New-Item -ItemType Directory -Path $testRoot | Out-Null
# /D must be last. The directory with spaces proves custom destination handling.
$process = Start-Process -FilePath $installers[0].FullName -ArgumentList "/S /D=$installDirectory" -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(180000)) { throw 'Installer timed out.' }
if ($process.ExitCode -ne 0) { throw "Installer failed: $($process.ExitCode)" }
$executable = Join-Path $installDirectory 'Brain Studio.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'Installed executable not found in chosen folder.' }
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Brain Studio.lnk'
$startShortcut = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs/Brain Studio.lnk'
if (-not (Test-Path -LiteralPath $desktopShortcut)) { throw 'Desktop shortcut missing.' }
if (-not (Test-Path -LiteralPath $startShortcut)) { throw 'Start Menu shortcut missing.' }
$shell = New-Object -ComObject WScript.Shell
foreach ($shortcut in @($desktopShortcut,$startShortcut)) {
  if ($shell.CreateShortcut($shortcut).TargetPath -ne $executable) { throw 'Shortcut points to the wrong executable.' }
}
& node -e "require('./scripts/platform/native-smoke.cjs').smoke(process.argv[1], 'dist/platform-evidence/installed')" $executable
if ($LASTEXITCODE -ne 0) { throw 'Installed app smoke test failed.' }
# Electron app names may be normalized by packaging; protect either documented location.
$sentinels = @()
foreach ($appName in @('brain-studio','Brain Studio')) {
  $dataDirectory = Join-Path $env:APPDATA $appName
  New-Item -ItemType Directory -Force -Path $dataDirectory | Out-Null
  $sentinel = Join-Path $dataDirectory ('installer-retention-' + [guid]::NewGuid().ToString('N') + '.txt')
  Set-Content -LiteralPath $sentinel -Value 'synthetic retention fixture' -Encoding UTF8
  $sentinels += $sentinel
}
$uninstaller = Join-Path $installDirectory 'Uninstall Brain Studio.exe'
if (-not (Test-Path -LiteralPath $uninstaller)) { throw 'Uninstaller missing.' }
$process = Start-Process -FilePath $uninstaller -ArgumentList '/S' -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(180000)) { throw 'Uninstaller timed out.' }
if ($process.ExitCode -ne 0) { throw 'Uninstaller returned failure.' }
# The NSIS uninstaller relaunches itself from a temporary copy and returns early,
# so wait for the app and both shortcuts to be removed before asserting.
$removedPaths = @($executable,$desktopShortcut,$startShortcut)
$deadline = (Get-Date).AddSeconds(90)
while ((@($removedPaths | Where-Object { Test-Path -LiteralPath $_ }).Count -gt 0) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
if (Test-Path -LiteralPath $executable) { throw 'Application remained after uninstall.' }
foreach ($shortcut in @($desktopShortcut,$startShortcut)) { if (Test-Path -LiteralPath $shortcut) { throw "Shortcut remained after uninstall: $shortcut" } }
foreach ($sentinel in $sentinels) {
  if (-not (Test-Path -LiteralPath $sentinel)) { throw 'Uninstall deleted user data.' }
  Remove-Item -LiteralPath $sentinel
}
New-Item -ItemType Directory -Force -Path 'dist/platform-evidence' | Out-Null
@{ customFolder=$true; installedSmoke=$true; desktopShortcut=$true; startMenuShortcut=$true; uninstall=$true; userDataRetained=$true } | ConvertTo-Json | Set-Content -LiteralPath 'dist/platform-evidence/windows-installer.json' -Encoding UTF8
