param([switch]$Stop, [switch]$Status)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$python=Join-Path $root '.runtime/train-venv/Scripts/python.exe'
$pointer=Join-Path $root '.runtime/training-python.txt'
if(Test-Path -LiteralPath $pointer){$python=(Get-Content -LiteralPath $pointer -Raw).Trim()}
if(-not(Test-Path -LiteralPath $python)){throw 'Training environment is missing. See docs/BACKGROUND-LEARNING.md.'}
if($Stop){& $python training/autolearn.py --stop; exit}
if($Status){& $python training/autolearn.py --status; exit}
New-Item -ItemType Directory -Force -Path '.runtime/autolearn' | Out-Null
Start-Process -FilePath $python -ArgumentList '-u','training/autolearn.py' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput '.runtime/autolearn/worker.stdout.log' -RedirectStandardError '.runtime/autolearn/worker.stderr.log'
Write-Output 'Background learning worker started. Use -Status to inspect it or -Stop to request a stop.'
