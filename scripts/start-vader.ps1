param([string]$OllamaPath, [string]$Model='qwen2.5:3b')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not $OllamaPath) {
    $installed=Get-Command ollama -ErrorAction SilentlyContinue
    if ($installed) {$OllamaPath=$installed.Source}
    elseif (Test-Path -LiteralPath '.runtime/ollama-path.txt') {$OllamaPath=(Get-Content -LiteralPath '.runtime/ollama-path.txt' -Raw).Trim()}
    else {throw 'Install Ollama from https://ollama.com/download or pass -OllamaPath with its executable path.'}
}
$env:OLLAMA_NO_CLOUD='1'
$env:OLLAMA_HOST='127.0.0.1:11434'
New-Item -ItemType Directory -Force -Path '.runtime/vader' | Out-Null
try {
    $existing=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 2
    Write-Host 'Using existing local Ollama server. Ensure it was started with OLLAMA_NO_CLOUD=1.'
} catch {
    $env:OLLAMA_MODELS=Join-Path $projectRoot '.runtime/models'
    Start-Process -FilePath $OllamaPath -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput '.runtime/ollama.stdout.log' -RedirectStandardError '.runtime/ollama.stderr.log' | Out-Null
    $ready=$false
    for($attempt=0;$attempt -lt 30;$attempt++) {
        try {Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 1 | Out-Null; $ready=$true; break} catch {Start-Sleep -Seconds 1}
    }
    if(-not $ready){throw 'Ollama did not start. See .runtime/ollama.stderr.log.'}
}
$installedModels=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags'
if($installedModels.models.name -notcontains $Model) { & $OllamaPath pull $Model; if($LASTEXITCODE -ne 0){throw 'Model download failed.'} }
node vader/cli.mjs --model $Model --chat
