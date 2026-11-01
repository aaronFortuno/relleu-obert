$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSCommandPath
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Cal tenir Node.js instal·lat per iniciar aquesta previsualització local.' }
$vitePath = Join-Path $projectPath 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Falten les dependències del projecte. Consulta README.md.' }
Push-Location -LiteralPath $projectPath
try {
  if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'dist\index.html'))) { & $nodePath $vitePath build --base=./ --configLoader native; if ($LASTEXITCODE -ne 0) { throw "No s’ha pogut preparar la web." } }
  Write-Host "Obre l’adreça que apareix a continuació. Mantén aquesta finestra oberta mentre proves la web."
  & $nodePath $vitePath preview --host 127.0.0.1 --port 5173 --configLoader native
} finally { Pop-Location }
