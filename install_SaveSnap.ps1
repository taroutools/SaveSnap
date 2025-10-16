param()

$scriptPath = Split-Path -Path $PSCommandPath -Parent
$sourceFile = Join-Path -Path $scriptPath -ChildPath 'SaveSnap.jsx'
$targetDir = 'C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\Scripts\ScriptUI Panels'
$targetFile = Join-Path -Path $targetDir -ChildPath 'SaveSnap.jsx'

function Ensure-Admin {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host 'Re-launching with elevated privileges...' -ForegroundColor Yellow
        $arguments = @(
            '-NoProfile'
            '-ExecutionPolicy'
            'Bypass'
            '-File'
            "`"$PSCommandPath`""
        )
        Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -Verb RunAs
        exit
    }
}

Ensure-Admin

try {
    if (-not (Test-Path -LiteralPath $sourceFile)) {
        throw "Source file not found: $sourceFile"
    }

    if (-not (Test-Path -LiteralPath $targetDir)) {
        Write-Host 'Creating target directory...' -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    if (Test-Path -LiteralPath $targetFile) {
        try {
            (Get-Item -LiteralPath $targetFile).IsReadOnly = $false
        }
        catch {
            Write-Host "WARNING: Failed to clear read-only flag on target file. $_" -ForegroundColor Yellow
        }
    }

    Write-Host 'Copying SaveSnap.jsx...' -ForegroundColor Cyan
    Copy-Item -LiteralPath $sourceFile -Destination $targetFile -Force -ErrorAction Stop

    Write-Host "Done: $targetFile" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.InnerException) {
        Write-Host "DETAIL: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
}
finally {
    Write-Host ''
    [void](Read-Host 'Press Enter to close')
}
