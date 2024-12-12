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

# Function to detect Docker installation type
detect_docker_installation() {
    print_info "Checking Docker installation..."
    
    # Check if Docker is installed via snap
    if command -v snap >/dev/null && snap list docker >/dev/null 2>&1; then
        DOCKER_IS_SNAP=true
        print_info "Detected Docker installed via snap"
        
        # For snap installations, we'll use a bridge directory in home
        DOCKER_COMPOSE_PATH="$HOME/.mboxmini"
    else
        DOCKER_IS_SNAP=false
        DOCKER_COMPOSE_PATH="$INSTALL_DIR"
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
    if cd "$INSTALL_DIR" && [ -f "docker-compose.yml" ]; then
        print_info "Stopping running services..."
        if [[ "$DOCKER_IS_SNAP" == true ]]; then
            cd "$DOCKER_COMPOSE_PATH" && docker compose down || true
        else
            docker compose down || true
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
    print_info "Removing installation directory..."
    sudo rm -rf "$INSTALL_DIR"
    
    # Clean up snap bridge directory if it exists
    if [[ "$DOCKER_IS_SNAP" == true ]] && [ -d "$DOCKER_COMPOSE_PATH" ]; then
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
    
    # Check sudo access early
    check_sudo
    
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

# Run main function with all arguments
main "$@" 