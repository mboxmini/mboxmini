#!/bin/bash

# Generate secrets if they don't exist
generate_secrets() {
    if [ -z "$API_KEY" ]; then
        API_KEY=$(openssl rand -hex 32)
        echo "Generated new API key: $API_KEY"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -hex 32)
        echo "Generated new JWT secret: $JWT_SECRET"
    fi
}

# Create initial admin user
create_admin_user() {
    local username="admin"
    local password=$(openssl rand -hex 8)  # Generate random 8-character password
    
    echo "Creating initial admin user..."
    echo "Username: $username"
    echo "Password: $password"
    
    # Store credentials in a secure file
    echo "Admin Credentials" > admin_credentials.txt
    echo "Username: $username" >> admin_credentials.txt
    echo "Password: $password" >> admin_credentials.txt
    chmod 600 admin_credentials.txt
    
    # Wait for the API to be ready and create the user
    echo "Waiting for API to be ready to create admin user..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null; then
            curl -X POST http://localhost:8080/api/auth/register \
                -H "Content-Type: application/json" \
                -d "{\"username\":\"$username\",\"password\":\"$password\"}"
            echo "Admin user created successfully!"
            break
        fi
        echo "Waiting for API... ($i/30)"
        sleep 1
    done
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
        -e "s|{{JWT_SECRET}}|$JWT_SECRET|g" \
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

# Generate secrets
generate_secrets

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

# Start services to create admin user
echo "Starting services to create admin user..."
docker-compose up -d

# Create admin user
create_admin_user

echo "Setup completed successfully!"
echo "Admin credentials have been saved to admin_credentials.txt" 