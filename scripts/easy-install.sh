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
        PLIST_FILE="$HOME/Library/LaunchAgents/com.mboxmini.app.plist"
        mkdir -p "$HOME/Library/LaunchAgents"
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
        launchctl load "$PLIST_FILE"
    else
        # Create systemd service for Linux
        cat > /etc/systemd/system/mboxmini.service << 'SERVICE'
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=__INSTALL_DIR__
EnvironmentFile=__INSTALL_DIR__/.env
Environment=COMPOSE_PROJECT_NAME=mboxmini
ExecStart=/usr/bin/docker compose --env-file __INSTALL_DIR__/.env --project-directory __INSTALL_DIR__ up -d
ExecStop=/usr/bin/docker compose --env-file __INSTALL_DIR__/.env --project-directory __INSTALL_DIR__ down
User=__DEFAULT_USER__

[Install]
WantedBy=multi-user.target
SERVICE
        # Replace placeholders in service file
        sed -i \
            -e "s|__INSTALL_DIR__|${INSTALL_DIR}|g" \
            -e "s|__DEFAULT_USER__|${DEFAULT_USER}|g" \
            "/etc/systemd/system/mboxmini.service"
        
        systemctl daemon-reload
        systemctl enable mboxmini.service
    fi
}

# Download necessary files
download_files() {
    print_info "Downloading necessary files..."
    
    # Create temporary directory
    TMP_DIR=$(mktemp -d)
    
    # Download docker-compose.yml
    if ! curl -sSL "https://raw.githubusercontent.com/mboxmini/mboxmini/main/docker-compose.yml" -o "$TMP_DIR/docker-compose.yml"; then
        print_error "Failed to download docker-compose.yml"
        rm -rf "$TMP_DIR"
        exit 1
    fi
    
    # Move files to installation directory
    mv "$TMP_DIR/docker-compose.yml" "$INSTALL_DIR/"
    
    # Cleanup
    rm -rf "$TMP_DIR"
}

# Clean up previous installation
cleanup_installation() {
    print_info "Cleaning up previous installation..."
    
    # Stop services
    if cd "$INSTALL_DIR" && [ -f "docker-compose.yml" ]; then
        print_info "Stopping running services..."
        docker compose down || true
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
            systemctl stop mboxmini 2>/dev/null || true
            systemctl disable mboxmini 2>/dev/null || true
            rm -f "/etc/systemd/system/mboxmini.service"
            systemctl daemon-reload
        fi
    fi
    
    # Backup data if exists
    if [ -d "$INSTALL_DIR/minecraft-data" ] && [ "$(ls -A $INSTALL_DIR/minecraft-data 2>/dev/null)" ]; then
        print_info "Backing up Minecraft data..."
        BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        mv "$INSTALL_DIR/minecraft-data" "$BACKUP_DIR/"
        print_info "Minecraft data backed up to: $BACKUP_DIR"
    fi
    
    # Remove installation directory
    print_info "Removing installation directory..."
    rm -rf "$INSTALL_DIR"
}

# Add function to setup docker permissions
setup_docker_permissions() {
    print_info "Setting up Docker permissions..."
    if ! getent group docker > /dev/null; then
        print_info "Creating docker group..."
        groupadd docker
    fi
    
    # Add user to docker group
    if [[ "$OS" != "macos" ]]; then
        print_info "Adding ${DEFAULT_USER} to docker group..."
        usermod -aG docker "${DEFAULT_USER}"
    fi
    
    # Set proper permissions on docker.sock
    if [ -S /var/run/docker.sock ]; then
        print_info "Setting permissions on docker.sock..."
        chmod 666 /var/run/docker.sock
    fi
}

# Modify the install_mboxmini function to handle directories properly:
install_mboxmini() {
    print_info "Installing MboxMini..."
    
    # Create system user if needed
    create_system_user
    
    # Setup docker permissions
    setup_docker_permissions
    
    # Create directories and files
    create_directories
    generate_secrets
    create_env_file
    
    # Download necessary files
    download_files
    
    # Setup auto-start service
    setup_service
    
    # Start services
    print_info "Starting services..."
    # Use env file with docker compose and ensure we're in the right directory
    if ! (cd "${INSTALL_DIR}" && COMPOSE_PROJECT_NAME=mboxmini docker compose --env-file "${INSTALL_DIR}/.env" up -d); then
        print_error "Failed to start services. Check the logs with: cd ${INSTALL_DIR} && docker compose logs"
        exit 1
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
    
    # Print OS-specific management instructions
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
    echo "cd ${INSTALL_DIR} && docker compose logs -f"
    
    if [[ "$OS" != "macos" ]]; then
        echo -e "\nNOTE: You may need to log out and back in for docker permissions to take effect."
    fi
}

# Main script
main() {
    # Detect OS and set defaults first
    detect_os
    
    # Check if we need sudo
    if [[ "$NEED_SUDO" == true && "$EUID" -ne 0 ]]; then
        print_error "Please run this script with sudo:"
        echo "sudo $0 $([[ "$FORCE_REINSTALL" == true ]] && echo '--force')"
        exit 1
    fi
    
    # Parse command line arguments
    FORCE_REINSTALL=false
    CUSTOM_INSTALL_DIR=""
    
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
            *)
                CUSTOM_INSTALL_DIR="$1"
                shift
                ;;
        esac
    done
    
    # Set installation directory, preferring custom if provided
    INSTALL_DIR="${CUSTOM_INSTALL_DIR:-$DEFAULT_DIR}"
    
    print_info "Starting MBoxMini setup on ${OS}..."
    print_info "Installation directory: ${INSTALL_DIR}"
    print_info "API Port: ${API_PORT:-$DEFAULT_API_PORT}"
    print_info "Frontend Port: ${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}"
    
    check_docker
    check_docker_compose
    
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
        print_info "Installing MboxMini in $INSTALL_DIR"
        install_mboxmini
    fi
}

# Update the usage function to be more descriptive
print_usage() {
    echo "Usage: $0 [-f|--force] [--api-port PORT] [--frontend-port PORT] [install_dir]"
    echo
    echo "Options:"
    echo "  -f, --force           Force reinstallation (removes existing installation)"
    echo "  --api-port PORT       Set API port (default: $DEFAULT_API_PORT)"
    echo "  --frontend-port PORT  Set frontend port (default: $DEFAULT_FRONTEND_PORT)"
    echo "  install_dir           Optional installation directory"
    echo "                        Default: $DEFAULT_DIR"
    echo
    echo "Examples:"
    echo "  $0                                    # Install with default settings"
    echo "  $0 --api-port 8081 --frontend-port 3001  # Install with custom ports"
    echo "  $0 --force /opt/custom/mboxmini         # Force reinstall in custom location"
}

# Run main function with all arguments
main "$@" 