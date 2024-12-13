#!/bin/bash

# Exit on error
set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DEFAULT_USER="$USER"
        DEFAULT_DIR="$HOME/mboxmini"
        NEED_SUDO=false
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
        DEFAULT_USER="mboxmini"
        DEFAULT_DIR="/opt/mboxmini"
        NEED_SUDO=true
    elif [[ -f /etc/redhat-release ]]; then
        OS="redhat"
        DEFAULT_USER="mboxmini"
        DEFAULT_DIR="/opt/mboxmini"
        NEED_SUDO=true
    else
        OS="linux"
        DEFAULT_USER="mboxmini"
        DEFAULT_DIR="/opt/mboxmini"
        NEED_SUDO=true
    fi

    # Default ports
    DEFAULT_FRONTEND_PORT=3000
    DEFAULT_API_PORT=8080
}

# Print with color
print_info() {
    echo -e "${GREEN}INFO: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

# Check if Docker is installed and running
check_docker() {
    print_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        if [[ "$OS" == "macos" ]]; then
            echo "Visit https://docs.docker.com/desktop/mac/install/ for installation instructions."
        else
            echo "Visit https://docs.docker.com/engine/install/ for installation instructions."
        fi
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
}

# Check if docker-compose is installed
check_docker_compose() {
    print_info "Checking Docker Compose installation..."
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit https://docs.docker.com/compose/install/ for installation instructions."
        exit 1
    fi
}

# Check if MboxMini is already installed
check_installation() {
    if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
        return 0
    else
        return 1
    fi
}

# Pull latest images
update_images() {
    print_info "Pulling latest images..."
    cd "$INSTALL_DIR"
    docker compose pull
    
    print_info "Restarting services with new images..."
    docker compose down
    docker compose up -d
    
    print_info "Update completed successfully!"
}

# Generate secrets
generate_secrets() {
    print_info "Generating secrets..."
    if [[ "$OS" == "macos" ]]; then
        API_KEY=$(openssl rand -hex 32)
        JWT_SECRET=$(openssl rand -base64 32)
        ADMIN_PASSWORD=$(openssl rand -base64 12)
    else
        API_KEY=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
        JWT_SECRET=$(tr -dc 'A-Za-z0-9!"#$%&'\''()*+,-./:;<=>?@[\]^_`{|}~' < /dev/urandom | head -c 32)
        ADMIN_PASSWORD=$(tr -dc 'A-Za-z0-9!@#$%^&*()_+' < /dev/urandom | head -c 12)
    fi
}

# Create environment file
create_env_file() {
    print_info "Creating environment file..."
    if [ -f "$INSTALL_DIR/.env" ]; then
        print_warning "Environment file already exists. Backing up to .env.backup"
        cp "$INSTALL_DIR/.env" "$INSTALL_DIR/.env.backup"
    fi

    # Create environment file with placeholders
    cat > "$INSTALL_DIR/.env" << 'ENVFILE'
# Security
API_KEY=__API_KEY__
JWT_SECRET=__JWT_SECRET__

# Paths
HOST_DATA_PATH=./minecraft-data
DATA_PATH=/minecraft-data
DB_PATH=/data/mboxmini.db

# Server Configuration
API_PORT=__API_PORT__
FRONTEND_PORT=__FRONTEND_PORT__
NODE_ENV=production

# Admin Credentials
ADMIN_EMAIL=admin@mboxmini.local
ADMIN_PASSWORD=__ADMIN_PASSWORD__
ENVFILE

    # Create a temporary file for sed operations
    TEMP_FILE=$(mktemp)
    cp "$INSTALL_DIR/.env" "$TEMP_FILE"

    # Replace placeholders one by one
    sed "s|__API_KEY__|${API_KEY}|" "$TEMP_FILE" > "$INSTALL_DIR/.env"
    cp "$INSTALL_DIR/.env" "$TEMP_FILE"
    
    sed "s|__JWT_SECRET__|${JWT_SECRET}|" "$TEMP_FILE" > "$INSTALL_DIR/.env"
    cp "$INSTALL_DIR/.env" "$TEMP_FILE"
    
    sed "s|__ADMIN_PASSWORD__|${ADMIN_PASSWORD}|" "$TEMP_FILE" > "$INSTALL_DIR/.env"
    cp "$INSTALL_DIR/.env" "$TEMP_FILE"
    
    sed "s|__API_PORT__|${API_PORT:-$DEFAULT_API_PORT}|" "$TEMP_FILE" > "$INSTALL_DIR/.env"
    cp "$INSTALL_DIR/.env" "$TEMP_FILE"
    
    sed "s|__FRONTEND_PORT__|${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}|" "$TEMP_FILE" > "$INSTALL_DIR/.env"

    # Clean up
    rm -f "$TEMP_FILE"
    
    chmod 600 "$INSTALL_DIR/.env"
    
    # Create credentials file
    cat > "$INSTALL_DIR/admin_credentials.txt" << EOF
MboxMini Admin Credentials
-------------------------
Email: admin@mboxmini.local
Password: ${ADMIN_PASSWORD}
API Key: ${API_KEY}

Please change these credentials after first login.
EOF
    chmod 600 "$INSTALL_DIR/admin_credentials.txt"
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    mkdir -p "$INSTALL_DIR/data" "$INSTALL_DIR/minecraft-data"
    
    # Set appropriate permissions based on OS
    if [[ "$OS" == "macos" ]]; then
        chown -R "$USER" "$INSTALL_DIR"
        chmod 755 "$INSTALL_DIR"
        chmod 755 "$INSTALL_DIR/data"
        chmod 755 "$INSTALL_DIR/minecraft-data"
    else
        chown -R "$DEFAULT_USER:$DEFAULT_USER" "$INSTALL_DIR"
        chmod 755 "$INSTALL_DIR"
        chmod 755 "$INSTALL_DIR/data"
        chmod 755 "$INSTALL_DIR/minecraft-data"
    fi
}

# Create system user (Linux only)
create_system_user() {
    if [[ "$OS" != "macos" ]]; then
        if ! id "$DEFAULT_USER" &>/dev/null; then
            print_info "Creating system user $DEFAULT_USER..."
            useradd -r -s /bin/false "$DEFAULT_USER"
        fi
    fi
}

# Setup auto-start service
setup_service() {
    print_info "Setting up auto-start service..."
    if [[ "$OS" == "macos" ]]; then
        # Create a launch agent for macOS
        PLIST_FILE="$REAL_HOME/Library/LaunchAgents/com.mboxmini.app.plist"
        mkdir -p "$REAL_HOME/Library/LaunchAgents"
        cat > "$PLIST_FILE" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mboxmini.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/docker</string>
        <string>compose</string>
        <string>-f</string>
        <string>__INSTALL_DIR__/docker-compose.yml</string>
        <string>up</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>API_KEY</key>
        <string>__API_KEY__</string>
        <key>JWT_SECRET</key>
        <string>__JWT_SECRET__</string>
        <key>ADMIN_PASSWORD</key>
        <string>__ADMIN_PASSWORD__</string>
        <key>HOST_DATA_PATH</key>
        <string>./minecraft-data</string>
        <key>DATA_PATH</key>
        <string>/minecraft-data</string>
        <key>DB_PATH</key>
        <string>/data/mboxmini.db</string>
        <key>API_PORT</key>
        <string>__API_PORT__</string>
        <key>FRONTEND_PORT</key>
        <string>__FRONTEND_PORT__</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>__INSTALL_DIR__</string>
    <key>StandardOutPath</key>
    <string>__INSTALL_DIR__/mboxmini.log</string>
    <key>StandardErrorPath</key>
    <string>__INSTALL_DIR__/mboxmini.error.log</string>
</dict>
</plist>
PLIST
        # Replace placeholders in plist file
        sed -i \
            -e "s|__INSTALL_DIR__|${INSTALL_DIR}|g" \
            -e "s|__API_KEY__|${API_KEY}|g" \
            -e "s|__JWT_SECRET__|${JWT_SECRET}|g" \
            -e "s|__ADMIN_PASSWORD__|${ADMIN_PASSWORD}|g" \
            -e "s|__API_PORT__|${API_PORT:-$DEFAULT_API_PORT}|g" \
            -e "s|__FRONTEND_PORT__|${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}|g" \
            "$PLIST_FILE"
        chmod 644 "$PLIST_FILE"
        if [ "$SUDO_USER" ]; then
            chown "$SUDO_USER:$(id -gn "$SUDO_USER")" "$PLIST_FILE"
        fi
        launchctl load "$PLIST_FILE"
    else
        # Create systemd service for Linux
        if [[ "$DOCKER_IS_SNAP" == true ]]; then
            # For snap Docker, use the bridge directory
            cat > /etc/systemd/system/mboxmini.service << SERVICE
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${DOCKER_COMPOSE_PATH}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=COMPOSE_PROJECT_NAME=mboxmini
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=${SUDO_USER:-$DEFAULT_USER}

[Install]
WantedBy=multi-user.target
SERVICE
        else
            # For non-snap Docker, use the installation directory
            cat > /etc/systemd/system/mboxmini.service << SERVICE
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=COMPOSE_PROJECT_NAME=mboxmini
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=${SUDO_USER:-$DEFAULT_USER}

[Install]
WantedBy=multi-user.target
SERVICE
        fi
        
        systemctl daemon-reload
        systemctl enable mboxmini.service
    fi
}

# Add to the top with other variables
DOCKER_IS_SNAP=false
DOCKER_COMPOSE_PATH=""

# Function to check if we have sudo access
check_sudo() {
    if ! command -v sudo >/dev/null; then
        print_error "sudo is not installed. Please install sudo first."
        exit 1
    fi
    
    # Check if user has sudo privileges
    if ! sudo -v &>/dev/null; then
        print_error "Current user does not have sudo privileges"
        exit 1
    fi
}

# Function to detect and handle Docker installation
detect_docker_installation() {
    print_info "Checking Docker installation..."
    
    # First check if Docker is installed at all
    if ! command -v docker >/dev/null; then
        print_info "Docker is not installed. Installing from official repository..."
        install_official_docker
        return
    fi
    
    # Check if Docker is running through snap or installed via apt
    local needs_migration=false
    if readlink -f $(which docker) | grep -q "snap"; then
        print_info "Detected Docker running via snap"
        needs_migration=true
    elif docker info 2>&1 | grep -q "snap"; then
        print_info "Detected Docker running via snap (installed through package manager)"
        needs_migration=true
    elif ! dpkg -l | grep -q "^ii.*docker-ce"; then
        print_info "Docker is not from official repository"
        needs_migration=true
    fi
    
    if [ "$needs_migration" = true ]; then
        print_warning "Current Docker installation needs to be migrated to official repository"
        print_warning "This is required due to known issues with snap version:"
        print_warning "https://github.com/canonical/docker-snap/issues/7"
        echo
        print_info "Proceeding with Docker migration..."
        migrate_docker_installation
    else
        print_info "Detected Docker installed from official repository"
    fi
}

# Function to install official Docker
install_official_docker() {
    print_info "Installing Docker from official repository..."
    
    # Add Docker's official GPG key
    print_info "Adding Docker's official GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    print_info "Adding Docker repository..."
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update apt and install Docker
    print_info "Installing Docker packages..."
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    print_info "Adding user to docker group..."
    sudo usermod -aG docker "$USER"
    
    # Start and enable Docker service
    print_info "Starting Docker service..."
    sudo systemctl enable --now docker
    
    # Wait for Docker to be ready
    print_info "Waiting for Docker to be ready..."
    for i in {1..30}; do
        if docker info >/dev/null 2>&1; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo
    
    print_info "Docker installation completed successfully!"
}

# Function to migrate from snap/apt Docker to official Docker
migrate_docker_installation() {
    print_info "Starting Docker migration..."
    
    # Stop any running containers
    print_info "Stopping running containers..."
    docker compose down 2>/dev/null || true
    
    # Remove snap Docker if installed
    if command -v snap >/dev/null && snap list docker >/dev/null 2>&1; then
        print_info "Removing Docker snap..."
        sudo snap remove docker
    fi
    
    # Remove apt Docker packages if installed
    if dpkg -l | grep -q "docker\.io\|docker-engine"; then
        print_info "Removing old Docker packages..."
        sudo apt-get remove -y docker docker-engine docker.io containerd runc
    fi
    
    # Install official Docker
    install_official_docker
    
    # Verify installation
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker installation failed. Please try installing manually:"
        echo "https://docs.docker.com/engine/install/ubuntu/"
        exit 1
    fi
    
    print_info "Docker migration completed successfully!"
    
    # Check if we need to restart the shell for group changes
    if ! groups | grep -q docker; then
        print_warning "Please run the following command to update group membership:"
        echo "newgrp docker"
    fi
}

# Function to create directories with proper permissions
create_directories() {
    print_info "Creating necessary directories..."
    
    # Create installation directory with sudo
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$USER:$(id -gn)" "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR"
    
    # Create data directories
    mkdir -p "$INSTALL_DIR/data" "$INSTALL_DIR/minecraft-data"
    chmod 755 "$INSTALL_DIR/data" "$INSTALL_DIR/minecraft-data"
    
    if [[ "$DOCKER_IS_SNAP" == true ]]; then
        mkdir -p "$DOCKER_COMPOSE_PATH"
        chmod 755 "$DOCKER_COMPOSE_PATH"
    fi
}

# Function to setup Docker access for snap installation
setup_snap_docker_access() {
    if [[ "$DOCKER_IS_SNAP" == true ]]; then
        print_info "Setting up snap Docker access..."
        
        # Create the bridge directory in home
        mkdir -p "$DOCKER_COMPOSE_PATH"
        chmod 755 "$DOCKER_COMPOSE_PATH"
        
        # Create symbolic links
        ln -sf "$INSTALL_DIR/docker-compose.yml" "$DOCKER_COMPOSE_PATH/docker-compose.yml"
        ln -sf "$INSTALL_DIR/.env" "$DOCKER_COMPOSE_PATH/.env"
        ln -sf "$INSTALL_DIR/minecraft-data" "$DOCKER_COMPOSE_PATH/minecraft-data"
        
        print_info "Created bridge directory at: $DOCKER_COMPOSE_PATH"
        print_info "Linked configuration files from: $INSTALL_DIR"
    fi
}

# Modify the systemd service creation
setup_service() {
    print_info "Setting up auto-start service..."
    check_sudo
    
    if [[ "$OS" == "macos" ]]; then
        # Create a launch agent for macOS
        PLIST_FILE="$HOME/Library/LaunchAgents/com.mboxmini.app.plist"
        mkdir -p "$HOME/Library/LaunchAgents"
        # ... rest of macOS service setup ...
    else
        # Create systemd service for Linux
        if [[ "$DOCKER_IS_SNAP" == true ]]; then
            # For snap Docker, use the bridge directory
            sudo tee /etc/systemd/system/mboxmini.service > /dev/null << SERVICE
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${DOCKER_COMPOSE_PATH}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=COMPOSE_PROJECT_NAME=mboxmini
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=$USER

[Install]
WantedBy=multi-user.target
SERVICE
        else
            # For non-snap Docker, use the installation directory
            sudo tee /etc/systemd/system/mboxmini.service > /dev/null << SERVICE
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=COMPOSE_PROJECT_NAME=mboxmini
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=$USER

[Install]
WantedBy=multi-user.target
SERVICE
        fi
        
        sudo systemctl daemon-reload
        sudo systemctl enable mboxmini.service
    fi
}

# Clean up previous installation
cleanup_installation() {
    print_info "Cleaning up previous installation..."
    check_sudo
    
    # Stop services
    if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
        print_info "Stopping running services..."
        if [[ "$DOCKER_IS_SNAP" == true ]] && [ -d "$DOCKER_COMPOSE_PATH" ]; then
            (cd "$DOCKER_COMPOSE_PATH" && docker compose down) || true
        else
            (cd "$INSTALL_DIR" && docker compose down) || true
        fi
    fi
    
    # Remove service files
    if [[ "$OS" == "macos" ]]; then
        if [ -f "$HOME/Library/LaunchAgents/com.mboxmini.app.plist" ]; then
            print_info "Removing launchd service..."
            launchctl unload "$HOME/Library/LaunchAgents/com.mboxmini.app.plist" 2>/dev/null || true
            rm -f "$HOME/Library/LaunchAgents/com.mboxmini.app.plist"
        fi
    else
        if [ -f "/etc/systemd/system/mboxmini.service" ]; then
            print_info "Removing systemd service..."
            sudo systemctl stop mboxmini 2>/dev/null || true
            sudo systemctl disable mboxmini 2>/dev/null || true
            sudo rm -f "/etc/systemd/system/mboxmini.service"
            sudo systemctl daemon-reload
        fi
    fi
    
    # Backup data if exists
    if [ -d "$INSTALL_DIR/minecraft-data" ] && [ "$(ls -A $INSTALL_DIR/minecraft-data 2>/dev/null)" ]; then
        print_info "Backing up Minecraft data..."
        BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        sudo mkdir -p "$BACKUP_DIR"
        sudo mv "$INSTALL_DIR/minecraft-data" "$BACKUP_DIR/"
        sudo chown -R "$USER:$(id -gn)" "$BACKUP_DIR"
        print_info "Minecraft data backed up to: $BACKUP_DIR"
    fi
    
    # Remove installation directory
    if [ -d "$INSTALL_DIR" ]; then
        print_info "Removing installation directory..."
        sudo rm -rf "$INSTALL_DIR"
    fi
    
    # Clean up snap bridge directory if it exists
    if [[ "$DOCKER_IS_SNAP" == true ]] && [ -d "$DOCKER_COMPOSE_PATH" ]; then
        print_info "Removing snap bridge directory..."
        rm -rf "$DOCKER_COMPOSE_PATH"
    fi
}

# Modify main function
main() {
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script with sudo"
        print_error "Run it as a regular user, it will ask for sudo when needed"
        exit 1
    fi
    
    # Check sudo access early
    check_sudo
    
    # Detect OS and Docker installation
    detect_os
    detect_docker_installation
    
    # Parse command line arguments
    FORCE_REINSTALL=false
    CUSTOM_INSTALL_DIR=""
    BRANCH="$DEFAULT_BRANCH"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force)
                FORCE_REINSTALL=true
                shift
                ;;
            --api-port)
                API_PORT="$2"
                shift 2
                ;;
            --frontend-port)
                FRONTEND_PORT="$2"
                shift 2
                ;;
            --branch)
                BRANCH="$2"
                shift 2
                ;;
            *)
                CUSTOM_INSTALL_DIR="$1"
                shift
                ;;
        esac
    done
    
    # Set installation directory
    INSTALL_DIR="${CUSTOM_INSTALL_DIR:-$DEFAULT_DIR}"
    
    if check_installation; then
        if [[ "$FORCE_REINSTALL" == true ]]; then
            print_warning "Forcing reinstallation of MboxMini..."
            cleanup_installation
            install_mboxmini
        else
            print_info "MboxMini is already installed in $INSTALL_DIR"
            read -p "Would you like to update to the latest version? [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                update_images
            else
                print_info "No changes made. Use --force to reinstall. Exiting..."
                exit 0
            fi
        fi
    else
        install_mboxmini
    fi
    
    # Setup snap Docker access if needed
    setup_snap_docker_access
}

# Update the usage function
print_usage() {
    echo "Usage: $0 [-f|--force] [--api-port PORT] [--frontend-port PORT] [--branch BRANCH] [install_dir]"
    echo
    echo "Options:"
    echo "  -f, --force           Force reinstallation (removes existing installation)"
    echo "  --api-port PORT       Set API port (default: $DEFAULT_API_PORT)"
    echo "  --frontend-port PORT  Set frontend port (default: $DEFAULT_FRONTEND_PORT)"
    echo "  --branch BRANCH       Set GitHub branch to use (default: $DEFAULT_BRANCH)"
    echo "                        Available branches: main, develop"
    echo "  install_dir           Optional installation directory"
    echo "                        Default: $DEFAULT_DIR"
    echo
    echo "Examples:"
    echo "  $0                                    # Install with default settings"
    echo "  $0 --api-port 8081 --frontend-port 3001  # Install with custom ports"
    echo "  $0 --force --branch develop             # Force reinstall using develop branch"
}

# Function to install MboxMini
install_mboxmini() {
    print_info "Installing MboxMini..."
    
    # Create directories with proper permissions
    create_directories
    
    # Generate secrets
    generate_secrets
    
    # Create environment file
    create_env_file
    
    # Create docker-compose.yml
    print_info "Creating docker-compose.yml..."
    cat > "$INSTALL_DIR/docker-compose.yml" << 'DOCKERCOMPOSE'
version: '3.8'

services:
  ui:
    image: intecco/mboxmini-ui:latest
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:${API_PORT:-8080}
    depends_on:
      api:
        condition: service_healthy

  api:
    image: intecco/mboxmini-api:latest
    ports:
      - "${API_PORT:-8080}:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - mboxmini-data:/data
      - ./minecraft-data:${DATA_PATH:-/minecraft-data}
    environment:
      - API_KEY=${API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - DATA_PATH=${DATA_PATH:-/minecraft-data}
      - NODE_ENV=${NODE_ENV:-production}
      - ADMIN_EMAIL=${ADMIN_EMAIL:-admin@mboxmini.local}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    depends_on:
      mc-image-pull:
        condition: service_completed_successfully

  # Service to ensure Minecraft image is pulled
  mc-image-pull:
    image: itzg/minecraft-server:latest
    command: echo "Minecraft server image pulled successfully"
    deploy:
      replicas: 0
    pull_policy: always

volumes:
  mboxmini-data:
    name: mboxmini-data
    driver: local
DOCKERCOMPOSE
    
    # Set proper permissions
    chmod 644 "$INSTALL_DIR/docker-compose.yml"
    
    # Setup snap Docker access if needed
    setup_snap_docker_access
    
    # Setup auto-start service
    setup_service
    
    # Start services
    print_info "Starting services..."
    if [[ "$DOCKER_IS_SNAP" == true ]]; then
        (cd "$DOCKER_COMPOSE_PATH" && docker compose up -d)
    else
        (cd "$INSTALL_DIR" && docker compose up -d)
    fi
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    API_PORT=${API_PORT:-$DEFAULT_API_PORT}
    for i in {1..30}; do
        if curl -s "http://localhost:${API_PORT}/health" >/dev/null; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo
    
    # Print success message
    FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
    print_info "Installation completed successfully!"
    echo -e "\nMboxMini is now running!"
    echo -e "Frontend URL: ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "Backend URL: ${GREEN}http://localhost:${API_PORT}${NC}"
    echo -e "\nDefault admin credentials:"
    echo -e "Email: ${GREEN}admin@mboxmini.local${NC}"
    echo -e "Password: ${GREEN}${ADMIN_PASSWORD}${NC}"
    echo -e "\nAPI Key: ${YELLOW}${API_KEY}${NC}"
    echo -e "These credentials are saved in: ${YELLOW}${INSTALL_DIR}/.env${NC}"
    
    # Print management instructions
    if [[ "$OS" == "macos" ]]; then
        echo -e "\nTo manage the service:"
        echo "launchctl start com.mboxmini.app   # Start the service"
        echo "launchctl stop com.mboxmini.app    # Stop the service"
        echo "launchctl unload ~/Library/LaunchAgents/com.mboxmini.app.plist  # Disable service"
        echo "launchctl load ~/Library/LaunchAgents/com.mboxmini.app.plist    # Enable service"
    else
        echo -e "\nTo manage the service:"
        echo "sudo systemctl start mboxmini   # Start the service"
        echo "sudo systemctl stop mboxmini    # Stop the service"
        echo "sudo systemctl restart mboxmini # Restart the service"
        echo "sudo systemctl status mboxmini  # Check service status"
    fi
    
    echo -e "\nTo view logs:"
    if [[ "$DOCKER_IS_SNAP" == true ]]; then
        echo "cd $DOCKER_COMPOSE_PATH && docker compose logs -f"
    else
        echo "cd $INSTALL_DIR && docker compose logs -f"
    fi
}

# Function to setup Docker permissions
setup_docker_permissions() {
    print_info "Setting up Docker permissions..."
    
    # Check if user is in docker group
    if ! groups | grep -q docker; then
        print_info "Adding user to docker group..."
        sudo usermod -aG docker "$USER"
        
        print_warning "You need to log out and back in for the group changes to take effect."
        print_warning "For now, we'll use a temporary solution to access Docker."
        
        # Temporary solution: use sudo for docker commands
        if ! sudo docker info >/dev/null 2>&1; then
            print_error "Failed to access Docker. Please check Docker installation."
            exit 1
        fi
        
        # Set DOCKER_SOCKET_WORKAROUND for other functions to use
        DOCKER_SOCKET_WORKAROUND=true
    else
        DOCKER_SOCKET_WORKAROUND=false
    fi
    
    # Ensure docker.sock has correct permissions
    if [ ! -w "/var/run/docker.sock" ]; then
        print_info "Setting permissions on docker.sock..."
        sudo chmod 666 /var/run/docker.sock
    fi
}

# Modify the start_services function
start_services() {
    print_info "Starting services..."
    
    # Change to the correct directory
    cd "$INSTALL_DIR" || exit 1
    
    # Start services with appropriate permissions
    if [ "$DOCKER_SOCKET_WORKAROUND" = true ]; then
        print_info "Using sudo to start services (one-time workaround)..."
        if ! sudo docker compose up -d; then
            print_error "Failed to start services. Check the logs with: cd $INSTALL_DIR && sudo docker compose logs"
            exit 1
        fi
    else
        if ! docker compose up -d; then
            print_error "Failed to start services. Check the logs with: cd $INSTALL_DIR && docker compose logs"
            exit 1
        fi
    fi
}

# Add to main function after detect_docker_installation
main() {
    # ... existing checks ...
    
    # Setup Docker permissions early
    setup_docker_permissions
    
    # ... rest of main function ...
}

# Modify the systemd service to ensure proper permissions
setup_service() {
    print_info "Setting up auto-start service..."
    
    # Create systemd service for Linux
    sudo tee /etc/systemd/system/mboxmini.service > /dev/null << SERVICE
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=COMPOSE_PROJECT_NAME=mboxmini
ExecStartPre=/bin/sh -c 'chmod 666 /var/run/docker.sock'
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=$USER

[Install]
WantedBy=multi-user.target
SERVICE
    
    sudo systemctl daemon-reload
    sudo systemctl enable mboxmini.service
}

# Run main function with all arguments
main "$@" 