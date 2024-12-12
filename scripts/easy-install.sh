#!/bin/bash

# Exit on error
set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ -f /etc/debian_version ]]; then
    OS="debian"
elif [[ -f /etc/redhat-release ]]; then
    OS="redhat"
else
    OS="linux"
fi

# Default values based on OS
if [[ "$OS" == "macos" ]]; then
    DEFAULT_USER="$USER"
    DEFAULT_DIR="$HOME/mboxmini"
    NEED_SUDO=false
else
    DEFAULT_USER="mboxmini"
    DEFAULT_DIR="/app/mboxmini"
    NEED_SUDO=true
fi

DEFAULT_PORT_FRONTEND="5173"
DEFAULT_PORT_BACKEND="8080"

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

# Check if we need sudo
if [[ "$NEED_SUDO" == true && "$EUID" -ne 0 ]]; then
    print_error "Please run this script with sudo:"
    echo "sudo bash $0"
    exit 1
fi

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    if [[ "$OS" == "macos" ]]; then
        echo "Visit https://docs.docker.com/desktop/mac/install/ for installation instructions."
    else
        echo "Visit https://docs.docker.com/engine/install/ for installation instructions."
    fi
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit https://docs.docker.com/compose/install/ for installation instructions."
    exit 1
fi

# Interactive configuration
echo
print_info "Starting MBoxMini installation on ${OS}..."
echo

# Ask for configuration values
read -p "Enter the user to run MBoxMini [$DEFAULT_USER]: " MBOX_USER
MBOX_USER=${MBOX_USER:-$DEFAULT_USER}

read -p "Enter the installation directory [$DEFAULT_DIR]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_DIR}

read -p "Enter the frontend port [$DEFAULT_PORT_FRONTEND]: " PORT_FRONTEND
PORT_FRONTEND=${PORT_FRONTEND:-$DEFAULT_PORT_FRONTEND}

read -p "Enter the backend port [$DEFAULT_PORT_BACKEND]: " PORT_BACKEND
PORT_BACKEND=${PORT_BACKEND:-$DEFAULT_PORT_BACKEND}

# Generate a secure JWT secret
if [[ "$OS" == "macos" ]]; then
    JWT_SECRET=$(openssl rand -base64 32)
else
    JWT_SECRET=$(tr -dc 'A-Za-z0-9!"#$%&'\''()*+,-./:;<=>?@[\]^_`{|}~' </dev/urandom | head -c 32)
fi

# Create system user if needed (Linux only)
if [[ "$OS" != "macos" && "$MBOX_USER" != "$USER" ]]; then
    if ! id "$MBOX_USER" &>/dev/null; then
        print_info "Creating system user $MBOX_USER..."
        useradd -r -s /bin/false "$MBOX_USER"
    fi
fi

# Create and secure installation directory
print_info "Setting up installation directory..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/minecraft-data"

# Create docker-compose.yml
print_info "Creating configuration files..."
cat > "$INSTALL_DIR/docker-compose.yml" << EOL
version: '3.8'

services:
  frontend:
    image: ghcr.io/mboxmini/frontend:latest
    ports:
      - "${PORT_FRONTEND}:5173"
    environment:
      - API_URL=http://localhost:${PORT_BACKEND}
      - NODE_ENV=production
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: ghcr.io/mboxmini/backend:latest
    ports:
      - "${PORT_BACKEND}:8080"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DATA_PATH=/minecraft-data
      - DB_PATH=/data/mboxmini.db
      - API_PORT=${PORT_BACKEND}
      - FRONTEND_URL=http://localhost:${PORT_FRONTEND}
      - NODE_ENV=production
    volumes:
      - ./data:/data
      - ./minecraft-data:/minecraft-data
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: sqlite:latest
    volumes:
      - ./data:/data
    restart: unless-stopped
EOL

# Create .env file with configuration
cat > "$INSTALL_DIR/.env" << EOL
# Security
JWT_SECRET=${JWT_SECRET}

# Paths
DATA_PATH=/minecraft-data
DB_PATH=/data/mboxmini.db

# Server Configuration
API_PORT=${PORT_BACKEND}
FRONTEND_URL=http://localhost:${PORT_FRONTEND}
NODE_ENV=production

# Default Admin Credentials (change after first login)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
EOL

# Set up proper permissions
print_info "Setting up permissions..."
if [[ "$OS" == "macos" ]]; then
    chown -R "$MBOX_USER" "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR/data"
    chmod 755 "$INSTALL_DIR/minecraft-data"
else
    chown -R "$MBOX_USER:$MBOX_USER" "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR/data"
    chmod 755 "$INSTALL_DIR/minecraft-data"
fi

# Create and set permissions for SQLite database
touch "$INSTALL_DIR/data/mboxmini.db"
if [[ "$OS" == "macos" ]]; then
    chown "$MBOX_USER" "$INSTALL_DIR/data/mboxmini.db"
else
    chown "$MBOX_USER:$MBOX_USER" "$INSTALL_DIR/data/mboxmini.db"
fi
chmod 644 "$INSTALL_DIR/data/mboxmini.db"

# Create startup script
print_info "Creating startup script..."
if [[ "$OS" == "macos" ]]; then
    # Create a launch agent for macOS
    PLIST_FILE="$HOME/Library/LaunchAgents/com.mboxmini.app.plist"
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$PLIST_FILE" << EOL
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
EOL
    chmod 644 "$PLIST_FILE"
    launchctl load "$PLIST_FILE"
else
    # Create systemd service for Linux
    cat > /etc/systemd/system/mboxmini.service << EOL
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
User=${MBOX_USER}

[Install]
WantedBy=multi-user.target
EOL
    systemctl daemon-reload
    systemctl enable mboxmini.service
fi

# Pull Docker images
print_info "Pulling Docker images..."
cd "$INSTALL_DIR"
docker compose pull

# Start the application
print_info "Starting MBoxMini..."
if [[ "$OS" == "macos" ]]; then
    launchctl start com.mboxmini.app
else
    systemctl start mboxmini.service
fi

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 10

# Print success message and generated credentials
echo "
${GREEN}Installation completed successfully!${NC}

MBoxMini is now running at:
- Frontend: http://localhost:${PORT_FRONTEND}
- Backend API: http://localhost:${PORT_BACKEND}

Default login credentials:
Email: admin@example.com
Password: admin123

Your generated JWT_SECRET is: ${JWT_SECRET}
(This is stored in your .env file at ${INSTALL_DIR}/.env)

Please change the admin credentials after first login.

System Configuration:
- System User: ${MBOX_USER}
- Install Directory: ${INSTALL_DIR}
- OS Type: ${OS}
"

if [[ "$OS" == "macos" ]]; then
    echo "To manage the service:
launchctl start com.mboxmini.app   # Start the service
launchctl stop com.mboxmini.app    # Stop the service
launchctl unload ~/Library/LaunchAgents/com.mboxmini.app.plist  # Disable service
launchctl load ~/Library/LaunchAgents/com.mboxmini.app.plist    # Enable service

To view logs:
tail -f ${INSTALL_DIR}/mboxmini.log         # Application logs
tail -f ${INSTALL_DIR}/mboxmini.error.log   # Error logs"
else
    echo "To manage the service:
sudo systemctl start mboxmini   # Start the service
sudo systemctl stop mboxmini    # Stop the service
sudo systemctl restart mboxmini # Restart the service
sudo systemctl status mboxmini  # Check service status

To view logs:
sudo journalctl -u mboxmini -f  # Follow service logs"
fi

echo "
To view container logs:
cd ${INSTALL_DIR} && docker compose logs -f

To update to the latest version:
cd ${INSTALL_DIR} && docker compose pull && docker compose up -d

Data Locations:
- Application data: ${INSTALL_DIR}/data
- Minecraft server data: ${INSTALL_DIR}/minecraft-data

Security Note:
- Directory permissions are set to 755
- Database file permission is set to 644
"

print_info "Setup complete! Please save the above information for future reference." 