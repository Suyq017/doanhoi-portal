Set-StrictMode -Version Latest
$ErrorActionPreference = 'SilentlyContinue'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
Set-Location -LiteralPath $root

# Clean generated artifacts in build folder
if (Test-Path -LiteralPath 'build') {
    Remove-Item -LiteralPath 'build\*.aux' -Force
    Remove-Item -LiteralPath 'build\*.fdb_latexmk' -Force
    Remove-Item -LiteralPath 'build\*.fls' -Force
    Remove-Item -LiteralPath 'build\*.lof' -Force
    Remove-Item -LiteralPath 'build\*.log' -Force
    Remove-Item -LiteralPath 'build\*.lot' -Force
    Remove-Item -LiteralPath 'build\*.out' -Force
    Remove-Item -LiteralPath 'build\*.toc' -Force
    Remove-Item -LiteralPath 'build\*.synctex.gz' -Force
}

# Clean accidental artifacts generated at root
Remove-Item -LiteralPath '.\*.aux' -Force
Remove-Item -LiteralPath '.\*.fdb_latexmk' -Force
Remove-Item -LiteralPath '.\*.fls' -Force
Remove-Item -LiteralPath '.\*.lof' -Force
Remove-Item -LiteralPath '.\*.log' -Force
Remove-Item -LiteralPath '.\*.lot' -Force
Remove-Item -LiteralPath '.\*.out' -Force
Remove-Item -LiteralPath '.\*.toc' -Force
Remove-Item -LiteralPath '.\*.synctex.gz' -Force

exit 0
