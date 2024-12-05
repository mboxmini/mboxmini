#!/bin/bash

# Generate API key if not exists
generate_api_key() {
    if [ -z "$API_KEY" ]; then
        API_KEY=$(openssl rand -hex 32)
        echo "Generated new API key: $API_KEY"
    fi
}

# Create environment file
create_env_file() {
    local env_file="$1"
    echo "API_KEY=$API_KEY" > "$env_file"
    echo "MINECRAFT_PORT=25565" >> "$env_file"
    echo "API_PORT=8080" >> "$env_file"
    echo "MAX_MEMORY=2G" >> "$env_file"
    chmod 600 "$env_file"  # Secure the env file
}

# Setup for different platforms
setup_platform() {
    case "$OSTYPE" in
        darwin*)  # macOS
            create_env_file "./scripts/config/mac.env"
            setup_mac_service
            ;;
        linux*)   # Linux
            create_env_file "./scripts/config/linux.env"
            setup_linux_service
            ;;
        msys*|cygwin*|mingw*)    # Windows
            create_env_file "./scripts/config/windows.env"
            setup_windows_service
            ;;
        *)
            echo "Unknown platform: $OSTYPE"
            exit 1
            ;;
    esac
}

# Platform-specific service setup
setup_mac_service() {
    cat > ~/Library/LaunchAgents/com.mboxmini.server.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mboxmini.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(pwd)/scripts/run.sh</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>API_KEY</key>
        <string>$API_KEY</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/minecraft.log</string>
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/minecraft.error.log</string>
</dict>
</plist>
EOF
    launchctl load ~/Library/LaunchAgents/com.mboxmini.server.plist
}

setup_linux_service() {
    sudo tee /etc/systemd/system/mboxmini.service << EOF
[Unit]
Description=MboxMini Server Manager
After=network.target

[Service]
Type=simple
User=$USER
Environment="API_KEY=$API_KEY"
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/scripts/run.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable mboxmini
}

setup_windows_service() {
    # Create a .NET service wrapper
    cat > install-service.ps1 << EOF
New-Service -Name "MboxMini" `
    -DisplayName "MboxMini Server Manager" `
    -Description "Manages Minecraft server through MboxMini API" `
    -StartupType Automatic `
    -BinaryPathName "$(pwd)\scripts\run.bat"
EOF
    powershell -ExecutionPolicy Bypass -File install-service.ps1
}

# Main setup process
mkdir -p scripts/config logs
generate_api_key
setup_platform 