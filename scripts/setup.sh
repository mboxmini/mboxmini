#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Print with color
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
}

# Check if docker-compose is installed
check_docker_compose() {
    print_status "Checking Docker Compose installation..."
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Generate random strings for secrets
generate_secrets() {
    print_status "Generating secrets..."
    API_KEY=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(openssl rand -base64 12)
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    if [ -f "$PROJECT_DIR/.env" ]; then
        print_warning "Environment file already exists. Backing up to .env.backup"
        cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup"
    fi

    print_status "Debug: Current working directory: $(pwd)"
    print_status "Debug: PROJECT_DIR: $PROJECT_DIR"
    print_status "Debug: PWD: $PWD"

    cat > "$PROJECT_DIR/.env" << EOF
# Security
API_KEY=${API_KEY}
JWT_SECRET=${JWT_SECRET}

# Paths
HOST_DATA_PATH=\${PWD}/minecraft-data
DATA_PATH=/minecraft-data
MINECRAFT_DATA_PATH=/minecraft-data
DB_PATH=/app/data/mboxmini.db

# Server Configuration
NODE_ENV=development
EOF

    print_status "Debug: Environment file contents:"
    cat "$PROJECT_DIR/.env"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    print_status "Debug: Creating directories in PROJECT_DIR: $PROJECT_DIR"
    mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/minecraft-data"
    chmod 777 "$PROJECT_DIR/data" "$PROJECT_DIR/minecraft-data"
    
    print_status "Debug: Directory contents:"
    ls -la "$PROJECT_DIR/data" "$PROJECT_DIR/minecraft-data"
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    cd "$PROJECT_DIR"
    
    print_status "Debug: Current working directory before docker-compose: $(pwd)"
    print_status "Debug: Contents of current directory:"
    ls -la
    
    print_status "Debug: Environment variables:"
    echo "PWD: $PWD"
    echo "HOST_DATA_PATH: ${PWD}/minecraft-data"
    echo "DATA_PATH: /minecraft-data"
    echo "MINECRAFT_DATA_PATH: /minecraft-data"
    
    docker compose -f docker-compose.build.yml up --build -d

    print_status "Waiting for services to be ready..."
    sleep 10

    # Check if services are running
    if ! docker compose -f docker-compose.build.yml ps | grep -q "Up"; then
        print_error "Services failed to start. Check docker-compose logs for details."
        docker compose -f docker-compose.build.yml logs
        exit 1
    fi
}

# Create admin user
create_admin_user() {
    print_status "Creating admin user..."
    local max_retries=30
    local retry_count=0
    local admin_email="admin@mboxmini.local"

    while [ $retry_count -lt $max_retries ]; do
        if curl -s http://localhost:8080/health > /dev/null; then
            print_status "API is ready, creating admin user..."
            
            # Try to create admin user
            if curl -s -X POST http://localhost:8080/api/auth/register \
                -H "Content-Type: application/json" \
                -d "{\"username\":\"$admin_email\",\"password\":\"$ADMIN_PASSWORD\"}" > /dev/null; then
                
                # Save credentials to file
                cat > "$PROJECT_DIR/admin_credentials.txt" << EOF
Admin Credentials
----------------
Email: $admin_email
Password: $ADMIN_PASSWORD
API Key: $API_KEY
EOF
                chmod 600 "$PROJECT_DIR/admin_credentials.txt"
                return 0
            fi
            print_error "Failed to create admin user. API returned an error."
            return 1
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -eq $max_retries ]; then
            print_error "Timeout waiting for API to become ready"
            return 1
        fi
        
        echo -n "."
        sleep 1
    done
}

# Main setup process
main() {
    print_status "Starting MboxMini setup..."
    
    # Change to project directory
    cd "$PROJECT_DIR"

    check_docker
    check_docker_compose
    generate_secrets
    create_env_file
    create_directories
    start_services
    create_admin_user

    print_status "Setup completed successfully!"
    echo -e "\nMboxMini is now running!"
    echo -e "Frontend URL: ${GREEN}http://localhost:3000${NC}"
    echo -e "Backend URL: ${GREEN}http://localhost:8080${NC}"
    echo -e "\nAdmin credentials have been saved to: ${YELLOW}$PROJECT_DIR/admin_credentials.txt${NC}"
    echo -e "Login with:"
    echo -e "Email: ${GREEN}admin@mboxmini.local${NC}"
    echo -e "Password: ${GREEN}${ADMIN_PASSWORD}${NC}"
    echo -e "\nTo view logs, run: ${YELLOW}docker compose -f docker-compose.build.yml logs -f${NC}"
    echo -e "To stop services, run: ${YELLOW}docker compose -f docker-compose.build.yml down${NC}"
}

# Run main function
main