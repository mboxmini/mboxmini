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
    chmod 600 "$env_file"
}

# Setup development environment
setup_dev() {
    echo "Setting up development environment..."
    
    # Install backend dependencies
    cd backend && go mod download && cd ..
    
    # Install frontend dependencies
    cd frontend && npm install && cd ..
}

# Main setup process
mkdir -p scripts/config logs minecraft-data
generate_api_key
setup_dev

# Create platform-specific configs
case "$OSTYPE" in
    darwin*)  create_env_file "./scripts/config/mac.env" ;;
    linux*)   create_env_file "./scripts/config/linux.env" ;;
    msys*|cygwin*|mingw*)  create_env_file "./scripts/config/windows.env" ;;
    *) echo "Unknown platform: $OSTYPE" && exit 1 ;;
esac 