# Configuration
$ApiUrl = "http://localhost:8080"
$ApiKey = "your-secret-key"

# Helper function for API calls
function Invoke-MinecraftAPI {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data
    )
    
    $headers = @{
        "X-API-Key" = $ApiKey
        "Content-Type" = "application/json"
    }
    
    $params = @{
        Method = $Method
        Uri = "$ApiUrl$Endpoint"
        Headers = $headers
    }
    
    if ($Data) {
        $params.Body = $Data
    }
    
    Invoke-RestMethod @params
}

# Test functions
function Test-ServerStatus {
    Write-Host "MboxMini - Testing server status..." -ForegroundColor Green
    Invoke-MinecraftAPI -Method "GET" -Endpoint "/api/server/status"
}

function Start-MinecraftServer {
    Write-Host "Starting server..." -ForegroundColor Green
    Invoke-MinecraftAPI -Method "POST" -Endpoint "/api/server/start"
}

function Stop-MinecraftServer {
    Write-Host "Stopping server..." -ForegroundColor Green
    Invoke-MinecraftAPI -Method "POST" -Endpoint "/api/server/stop"
}

function Get-OnlinePlayers {
    Write-Host "Getting online players..." -ForegroundColor Green
    Invoke-MinecraftAPI -Method "GET" -Endpoint "/api/server/players"
}

function Invoke-MinecraftCommand {
    param([string]$Command)
    Write-Host "Executing command: $Command" -ForegroundColor Green
    $data = @{
        command = $Command
    } | ConvertTo-Json
    Invoke-MinecraftAPI -Method "POST" -Endpoint "/api/server/command" -Data $data
}

function Update-ServerConfig {
    Write-Host "Updating server configuration..." -ForegroundColor Green
    $data = @{
        properties = @{
            "max-players" = "20"
            "difficulty" = "normal"
            "pvp" = "true"
        }
    } | ConvertTo-Json
    Invoke-MinecraftAPI -Method "POST" -Endpoint "/api/server/config" -Data $data
}

# Example usage
switch ($args[0]) {
    "status" { Test-ServerStatus }
    "start" { Start-MinecraftServer }
    "stop" { Stop-MinecraftServer }
    "players" { Get-OnlinePlayers }
    "command" { 
        if ($args[1]) {
            Invoke-MinecraftCommand -Command $args[1]
        } else {
            Write-Host "Please provide a command" -ForegroundColor Red
        }
    }
    "config" { Update-ServerConfig }
    default { Write-Host "Usage: .\Test-MinecraftAPI.ps1 {status|start|stop|players|command <cmd>|config}" }
} 