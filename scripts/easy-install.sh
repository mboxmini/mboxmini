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

    cat > "$INSTALL_DIR/.env" << EOF
# Security
API_KEY=${API_KEY}
JWT_SECRET=${JWT_SECRET}

# Paths
HOST_DATA_PATH=./minecraft-data
DATA_PATH=/minecraft-data
DB_PATH=/data/mboxmini.db

# Server Configuration
API_PORT=8080
FRONTEND_PORT=3000
NODE_ENV=production

# Admin Credentials
ADMIN_EMAIL=admin@mboxmini.local
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF

    chmod 600 "$INSTALL_DIR/.env"
    
    # Save credentials to a separate file for reference
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
        cat > "$PLIST_FILE" << EOF
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
        <string>${INSTALL_DIR}/docker-compose.yml</string>
        <string>up</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${INSTALL_DIR}</string>
    <key>StandardOutPath</key>
    <string>${INSTALL_DIR}/mboxmini.log</string>
    <key>StandardErrorPath</key>
    <string>${INSTALL_DIR}/mboxmini.error.log</string>
</dict>
</plist>
EOF
        chmod 644 "$PLIST_FILE"
        launchctl load "$PLIST_FILE"
    else
        # Create systemd service for Linux
        cat > /etc/systemd/system/mboxmini.service << EOF
[Unit]
Description=MBoxMini Minecraft Server Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=${DEFAULT_USER}

[Install]
WantedBy=multi-user.target
EOF
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

# Install MboxMini
install_mboxmini() {
    print_info "Installing MboxMini..."
    
    # Create system user if needed
    create_system_user
    
    # Create directories and files
    create_directories
    generate_secrets
    create_env_file
    
    # Download necessary files
    download_files
    
    # Setup auto-start service
    setup_service
    
    # Start services
    cd "$INSTALL_DIR"
    
    # Export environment variables
    set -a
    source .env
    set +a
    
    print_info "Starting services..."
    if ! docker compose up -d; then
        print_error "Failed to start services. Check the logs with: docker compose logs"
        exit 1
    fi
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    for i in {1..30}; do
        if curl -s http://localhost:${API_PORT}/health >/dev/null; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo
    
    print_info "Installation completed successfully!"
    echo -e "\nMboxMini is now running!"
    echo -e "Frontend URL: ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "Backend URL: ${GREEN}http://localhost:${API_PORT}${NC}"
    echo -e "\nDefault admin credentials:"
    echo -e "Email: ${GREEN}${ADMIN_EMAIL}${NC}"
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
    echo "docker compose logs -f"
}

# Main script
main() {
    # Detect OS and set defaults
    detect_os
    
    # Check if we need sudo
    if [[ "$NEED_SUDO" == true && "$EUID" -ne 0 ]]; then
        print_error "Please run this script with sudo:"
        echo "sudo $0"
        exit 1
    fi
    
    # Set installation directory
    INSTALL_DIR="${1:-$DEFAULT_DIR}"
    
    print_info "Starting MBoxMini setup on ${OS}..."
    
    check_docker
    check_docker_compose
    
    if check_installation; then
        print_info "MboxMini is already installed in $INSTALL_DIR"
        read -p "Would you like to update to the latest version? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            update_images
        else
            print_info "No changes made. Exiting..."
            exit 0
        fi
    else
        print_info "Installing MboxMini in $INSTALL_DIR"
        install_mboxmini
    fi
}

# Run main function with provided installation directory or default
main "$@" 