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
    local env_dir=$(dirname "$env_file")
    
    # Create directory if it doesn't exist
    mkdir -p "$env_dir"
    
    echo "API_KEY=$API_KEY" > "$env_file"
    echo "MINECRAFT_PORT=25565" >> "$env_file"
    echo "API_PORT=8080" >> "$env_file"
    echo "MAX_MEMORY=2G" >> "$env_file"
    chmod 600 "$env_file"
    echo "Created environment file: $env_file"
}

# Initialize frontend
init_frontend() {
    echo "Initializing frontend..."
    mkdir -p frontend/public frontend/src
    
    # Create basic React files if they don't exist
    if [ ! -f frontend/src/index.tsx ]; then
        echo "Creating frontend source files..."
        # Add your frontend initialization here
    fi
}

# Setup development environment
setup_dev() {
    echo "Setting up development environment..."
    
    # Create necessary directories
    mkdir -p logs minecraft-data

    # Install backend dependencies
    echo "Installing backend dependencies..."
    cd backend && go mod download && cd ..
    
    # Initialize and install frontend dependencies
    echo "Installing frontend dependencies..."
    init_frontend
    cd frontend && npm install && cd ..
}

# Main setup process
echo "Starting MboxMini setup..."

# Create necessary directories
mkdir -p scripts/config

# Generate API key
generate_api_key

# Setup development environment
setup_dev

# Create platform-specific configs
case "$OSTYPE" in
    darwin*)  
        echo "Detected macOS"
        create_env_file "./scripts/config/mac.env" 
        ;;
    linux*)   
        echo "Detected Linux"
        create_env_file "./scripts/config/linux.env" 
        ;;
    msys*|cygwin*|mingw*)  
        echo "Detected Windows"
        create_env_file "./scripts/config/windows.env" 
        ;;
    *) 
        echo "Unknown platform: $OSTYPE" 
        exit 1 
        ;;
esac

echo "Setup completed successfully!" 