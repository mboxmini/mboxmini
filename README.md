# MboxMini

A lightweight Minecraft server manager with a secure API interface. MboxMini allows young developers to easily deploy and manage their own Minecraft servers with features similar to popular hosting services.

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/your-username/mboxmini.git
cd mboxmini
```

2. Run the setup script:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Generate a secure API key
- Create platform-specific configuration
- Install as a system service
- Start the server

3. Control the service:
```bash
./scripts/control.sh start   # Start the service
./scripts/control.sh stop    # Stop the service
./scripts/control.sh status  # Check service status
```

## Configuration

Environment variables are stored in platform-specific files:
- `scripts/config/mac.env` - macOS configuration
- `scripts/config/linux.env` - Linux configuration
- `scripts/config/windows.env` - Windows configuration

Key configuration options:
- `API_KEY` - Authentication key for API access
- `MINECRAFT_PORT` - Minecraft server port (default: 25565)
- `API_PORT` - API server port (default: 8080)
- `MAX_MEMORY` - Maximum memory allocation (default: 2G)

## Service Management

### macOS
The service is managed through launchd:
```bash
# Start service
launchctl load ~/Library/LaunchAgents/com.mboxmini.server.plist

# Stop service
launchctl unload ~/Library/LaunchAgents/com.mboxmini.server.plist
```

### Linux
The service is managed through systemd:
```bash
# Start service
sudo systemctl start mboxmini

# Stop service
sudo systemctl stop mboxmini

# Enable at boot
sudo systemctl enable mboxmini
```

### Windows
The service is managed through Windows Service Manager:
```powershell
# Start service
Start-Service MboxMini

# Stop service
Stop-Service MboxMini
```

## Detailed Setup Guide

### Development Environment

1. Install Go:
   - Download from [golang.org](https://golang.org/dl/)
   - Verify installation: `go version`

2. Install Docker:
   - Follow instructions at [docs.docker.com](https://docs.docker.com/get-docker/)
   - Install Docker Compose

3. Configure IDE:
   - Recommended: VSCode with Go extension
   - Enable Go modules

### Building the Project

1. Development build:
```bash
go run api/main.go
```

2. Production build:
```bash
# Linux/macOS
go build -o bin/server api/main.go

# Windows
go build -o bin/server.exe api/main.go
```

### Docker Configuration

The `docker-compose.yml` file configures the Minecraft server:
```yaml
version: '3'
services:
  minecraft:
    image: itzg/minecraft-server
    container_name: minecraft-server
    environment:
      EULA: "TRUE"
      MEMORY: "2G"
    volumes:
      - ./minecraft-data:/data
    ports:
      - "25565:25565"
```

### API Documentation

All endpoints require the `X-API-Key` header.

1. Server Management:
   - `POST /api/server/start` - Start server
   - `POST /api/server/stop` - Stop server
   - `GET /api/server/status` - Get server status
   - `POST /api/server/command` - Execute command
   - `GET /api/server/players` - List online players
   - `POST /api/server/config` - Update server properties

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MboxMini uses a dual-licensing model:

### Personal Use License (Free)
- Running the server for personal enjoyment
- Learning and educational purposes
- Contributing to the project
- Modifying for personal use
- Non-commercial use only

### Commercial Use License (Paid)
A commercial license is required for:
- Running the server as part of a business operation
- Generating revenue directly or indirectly using the software
- Providing services based on the software
- Using the software in a commercial hosting environment

For commercial licensing inquiries, please contact the project team.

### Terms
All contributions to the project are welcome and will be licensed under these same terms. See the [LICENSE](LICENSE) file for the complete license text.

## Support

For support:
1. Check the [Issues](https://github.com/your-username/mboxmini/issues) page
2. Create a new issue if needed
3. Visit our website: [mboxmini.com](https://mboxmini.com)
4. Join our [Discord community](https://discord.gg/mboxmini)

## Acknowledgments

- [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server) for the Docker image
- The Minecraft community
