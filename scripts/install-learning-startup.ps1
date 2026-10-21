$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$pythonw=Join-Path $root '.runtime/train-venv/Scripts/pythonw.exe'
$pointer=Join-Path $root '.runtime/training-python.txt'
if(Test-Path -LiteralPath $pointer){$pythonw=Join-Path (Split-Path -Parent ((Get-Content -LiteralPath $pointer -Raw).Trim())) 'pythonw.exe'}
if(-not(Test-Path -LiteralPath $pythonw)){throw 'Create the training environment first.'}
$startup=[Environment]::GetFolderPath('Startup')
$target=Join-Path $startup 'Vader Background Learning.lnk'
$shell=New-Object -ComObject WScript.Shell
$shortcut=$shell.CreateShortcut($target)
if((Test-Path -LiteralPath $target) -and $shortcut.Arguments -ne ('"'+(Join-Path $root 'training/autolearn.py')+'"')){throw 'A different Vader startup entry exists; inspect it before replacing it.'}
$shortcut.TargetPath=$pythonw
$shortcut.Arguments='"'+(Join-Path $root 'training/autolearn.py')+'"'
$shortcut.WorkingDirectory=$root
$shortcut.WindowStyle=7
$shortcut.Description='Local public-dataset collection and candidate training for vader'
$shortcut.Save()
Write-Output "Installed per-user startup entry: $target"
