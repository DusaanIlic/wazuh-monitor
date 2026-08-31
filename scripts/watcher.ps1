param(
    [Parameter(Mandatory = $true)]
    [string]$AgentId,

    [Parameter(Mandatory = $true)]
    [string]$BackendUrl
)

$logFile = 'C:\wazuh-trigger\watcher.log'
$pollIntervalSec = 3
$requestTimeoutSec = 5

$logDir = Split-Path -Path $logFile -Parent
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$timestamp] $Message"
    try {
        Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
    } catch {}
    Write-Host $line
}

function Take-AndUpload-Screenshot {
    param([string]$AgentId, [string]$BackendUrl)

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $tempPath = Join-Path $env:TEMP "wazuh_screenshot_$timestamp.png"

    try {
        $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose()
        $bitmap.Dispose()

        $bytes = [System.IO.File]::ReadAllBytes($tempPath)
        $base64 = [System.Convert]::ToBase64String($bytes)

        $body = @{
            agentId   = $AgentId
            image     = $base64
            timestamp = $timestamp
        } | ConvertTo-Json

        $uploadUrl = "$($BackendUrl.TrimEnd('/'))/api/screenshots/upload/$AgentId"
        Invoke-WebRequest -Uri $uploadUrl -Method Post -Body $body -ContentType 'application/json' -TimeoutSec $requestTimeoutSec -UseBasicParsing | Out-Null

        Write-Log "Screenshot uspesno poslat za agenta $AgentId"
    } finally {
        if (Test-Path $tempPath) {
            Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Log "Watcher pokrenut za agenta $AgentId, backend: $BackendUrl"

# Spoljna petlja - garantuje da watcher nikad ne stane, cak i ako nesto
# neocekivano pukne van unutrasnjeg try/catch-a
while ($true) {
    try {
        while ($true) {
            try {
                $pendingUrl = "$($BackendUrl.TrimEnd('/'))/api/screenshots/pending/$AgentId"
                $response = Invoke-WebRequest -Uri $pendingUrl -Method Get -TimeoutSec $requestTimeoutSec -UseBasicParsing
                $result = $response.Content | ConvertFrom-Json

                if ($result.pending -eq $true) {
                    Write-Log "Pending screenshot zahtev detektovan za agenta $AgentId"
                    Take-AndUpload-Screenshot -AgentId $AgentId -BackendUrl $BackendUrl
                }
            } catch {
                Write-Log "GRESKA u watcher petlji: $($_.Exception.Message)"
                Start-Sleep -Seconds 3
            }

            Start-Sleep -Seconds $pollIntervalSec
        }
    } catch {
        Write-Log "KRITICNA GRESKA - watcher petlja je prekinuta, restartujem: $($_.Exception.Message)"
        Start-Sleep -Seconds 3
    }
}
