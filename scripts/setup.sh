#!/bin/bash

# Generate API key if not exists
generate_api_key() {
    if [ -z "$API_KEY" ]; then
        API_KEY=$(openssl rand -hex 32)
        echo "Generated new API key: $API_KEY"
    fi
}

# Get absolute path for minecraft-data
HOST_DATA_PATH="$(pwd)/minecraft-data"
mkdir -p "$HOST_DATA_PATH"

# Create environment files from template
create_env_files() {
    local backend_env="$1"
    local frontend_env="frontend/.env"
    local template="scripts/config/template.env"

    # Read template
    if [ ! -f "$template" ]; then
        echo "Error: Template file not found at $template"
        exit 1
    fi

    # Create backend environment file
    echo "Creating backend environment file: $backend_env"
    sed -e "s|{{API_KEY}}|$API_KEY|g" \
        -e "s|{{HOST_DATA_PATH}}|$HOST_DATA_PATH|g" \
        -e "s|{{API_PORT}}|8080|g" \
        -e "s|{{MINECRAFT_PORT}}|25565|g" \
        "$template" > "$backend_env"
    chmod 600 "$backend_env"

    # Create frontend environment file
    echo "Creating frontend environment file: $frontend_env"
    grep "^REACT_APP_" "$template" | \
    sed -e "s|{{API_KEY}}|$API_KEY|g" \
        -e "s|{{API_PORT}}|8080|g" \
        -e "s|{{MINECRAFT_PORT}}|25565|g" \
        > "$frontend_env"
    chmod 600 "$frontend_env"
}

# Initialize frontend
init_frontend() {
    echo "Initializing frontend..."
    mkdir -p frontend/public frontend/src
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
        create_env_files "./scripts/config/mac.env"
        ;;
    linux*)   
        echo "Detected Linux"
        create_env_files "./scripts/config/linux.env"
        ;;
    msys*|cygwin*|mingw*)  
        echo "Detected Windows"
        create_env_files "./scripts/config/windows.env"
        ;;
    *) 
        echo "Unknown platform: $OSTYPE" 
        exit 1 
        ;;
esac

echo "Setup completed successfully!" 