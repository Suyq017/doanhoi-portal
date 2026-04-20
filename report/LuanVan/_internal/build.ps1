Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
Set-Location -LiteralPath $root

New-Item -ItemType Directory -Force -Path 'build' | Out-Null

xelatex -synctex=1 -interaction=nonstopmode -file-line-error -output-directory=build main.tex
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$sourcePdf = Join-Path $root 'build\\main.pdf'
$destPdf = Join-Path $root 'main.pdf'
$copied = $false

for ($i = 0; $i -lt 5 -and -not $copied; $i++) {
	try {
		Copy-Item -LiteralPath $sourcePdf -Destination $destPdf -Force -ErrorAction Stop
		$copied = $true
	}
	catch {
		if ($i -eq 4) {
			Write-Warning 'Could not overwrite main.pdf because it is in use. build/main.pdf is updated; close the viewer and build again to refresh main.pdf.'
		}
	}
}