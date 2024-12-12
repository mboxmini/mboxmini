# 🎮 MboxMini

[![License](https://img.shields.io/badge/license-Dual%20License-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?style=flat&logo=go)](https://golang.org/dl/)
[![Docker](https://img.shields.io/badge/Docker-Required-2496ED?style=flat&logo=docker)](https://docs.docker.com/get-docker/)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289DA?style=flat&logo=discord&logoColor=white)](https://discord.gg/cuv3HtA55G)
[![GitHub Issues](https://img.shields.io/github/issues/mboxmini/mboxmini)](https://github.com/mboxmini/mboxmini/issues)
[![GitHub Stars](https://img.shields.io/github/stars/mboxmini/mboxmini)](https://github.com/mboxmini/mboxmini/stargazers)

🚀 A lightweight Minecraft server manager with a secure API interface. MboxMini allows you to easily deploy and manage your own Minecraft server on your local machine or mini PC, with features similar to popular hosting services.

## ✨ Features

- 🔒 Secure API with key authentication
- 🐳 Docker-based deployment
- 🎮 Full Minecraft server control
- 📊 Server status monitoring
- 👥 Player management
- ⚡ Easy to set up and use
- 🔧 Configurable settings

## 🚀 Quick Start

### Easy Installation (Recommended)

The easiest way to get started is using our one-line installation script:

For macOS:
```bash
curl -fsSL https://raw.githubusercontent.com/mboxmini/mboxmini/main/scripts/easy-install.sh | bash
```

For Linux (requires sudo):
```bash
curl -fsSL https://raw.githubusercontent.com/mboxmini/mboxmini/main/scripts/easy-install.sh | sudo bash
```

The script will:
- 🔍 Detect your operating system
- ⚙️ Configure appropriate paths and permissions
- 🔑 Generate secure JWT secret
- 📦 Set up Docker containers
- 🚀 Start the application
- 🔧 Configure auto-start on boot

To customize the installation, you can use additional options:
```bash
# Custom ports
curl -fsSL https://raw.githubusercontent.com/mboxmini/mboxmini/main/scripts/easy-install.sh | sudo bash -s -- --api-port 8081 --frontend-port 3001

# Force reinstall with custom ports
curl -fsSL https://raw.githubusercontent.com/mboxmini/mboxmini/main/scripts/easy-install.sh | sudo bash -s -- --force --api-port 8081 --frontend-port 3001
```

Available options:
- `--force` - Force reinstallation (removes existing installation)
- `--api-port PORT` - Set API port (default: 8080)
- `--frontend-port PORT` - Set frontend port (default: 3000)
- `install_dir` - Optional installation directory (default: `/opt/mboxmini` on Linux, `~/mboxmini` on macOS)

To update to the latest version, simply run the same script again:
```bash
./scripts/easy-install.sh
```
The script will detect the existing installation and offer to update to the latest version.

To force a complete reinstallation (this will backup existing Minecraft data):
```bash
# For macOS:
./scripts/easy-install.sh --force

# For Linux (with sudo):
sudo ./scripts/easy-install.sh --force

# Or directly with curl on Linux:
curl -fsSL https://raw.githubusercontent.com/mboxmini/mboxmini/main/scripts/easy-install.sh | sudo bash -s -- --force
```

The force reinstall will:
- 💾 Backup existing Minecraft data
- 🧹 Remove existing installation
- 🚫 Stop and remove services
- ✨ Perform fresh installation

### Manual Installation (Pre-built Images)

If you prefer to install manually using pre-built images:

1. Clone the repository:
```bash
git clone https://github.com/mboxmini/mboxmini.git
cd mboxmini
```

2. Run the setup script:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- 🔑 Generate secure API key and JWT secret
- 👤 Create initial admin user
- ⚙️ Create environment configuration
- 📁 Set up necessary directories
- 🚀 Start all services

Your server will be available at:
- 🎮 Minecraft Server: `localhost:25565`
- 🌐 Web Interface: `http://localhost:3000`
- 📊 Management API: `http://localhost:8080`

### Development Setup (Local Build)

For development or customization:

1. Clone and enter the repository:
```bash
git clone https://github.com/mboxmini/mboxmini.git
cd mboxmini
```

2. Run the setup script with build configuration:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

3. The script will:
- 🔨 Build both frontend and backend from source
- 🔑 Generate necessary secrets
- 👤 Create admin user
- 🚀 Start all services

## ⚙️ Configuration

Environment variables are configured in `.env` file during setup. Key configuration options:
- `API_KEY` - Authentication key for API access (auto-generated)
- `JWT_SECRET` - Secret for JWT token generation (auto-generated)
- `HOST_DATA_PATH` - Path for Minecraft server data
- `MINECRAFT_PORT` - Minecraft server port (default: 25565)
- `API_PORT` - API server port (default: 8080)

## 💻 Development

### Prerequisites
- 🐳 Docker and Docker Compose
- 🔧 Go 1.22 or later
- 📦 Node.js and npm (for frontend)

### Backend Development
```bash
cd backend
go mod download
go run api/main.go
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## 🐳 Docker Commands

Common operations:
```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart

# Build and start (development)
docker compose -f docker-compose.build.yml up --build

# Start pre-built images
docker compose up -d
```

## 🔧 API Documentation

All endpoints require authentication using the API key in the header:
```
Authorization: Bearer <YOUR_API_KEY>
```

Available endpoints:
- 🟢 `POST /api/server/start` - Start server
- 🔴 `POST /api/server/stop` - Stop server
- 📊 `GET /api/server/status` - Get server status
- 🔧 `POST /api/server/command` - Execute command
- 👥 `GET /api/server/players` - List online players
- ⚙️ `POST /api/server/config` - Update server properties

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request at [github.com/mboxmini/mboxmini](https://github.com/mboxmini/mboxmini)

## 📜 License

MboxMini uses a dual-licensing model:

### 🆓 Personal Use License (Free)
- Running the server for personal enjoyment
- Learning and educational purposes
- Contributing to the project
- Modifying for personal use
- Non-commercial use only

### 💰 Commercial Use License (Paid)
A commercial license is required for:
- Running the server as part of a business operation
- Generating revenue directly or indirectly using the software
- Providing services based on the software
- Using the software in a commercial hosting environment

For commercial licensing inquiries, please contact the project team.

### Terms
All contributions to the project are welcome and will be licensed under these same terms. See the [LICENSE](LICENSE) file for the complete license text.

## 🌟 Community & Support

Join our growing community:

[![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289DA?style=flat&logo=discord&logoColor=white)](https://discord.gg/cuv3HtA55G)
[![GitHub Discussions](https://img.shields.io/github/discussions/mboxmini/mboxmini?label=Discussions&logo=github)](https://github.com/mboxmini/mboxmini/discussions)
[![Twitter Follow](https://img.shields.io/twitter/follow/mboxmini?style=social)](https://twitter.com/mboxmini)

For support:
1. 📋 Check the [Issues](https://github.com/mboxmini/mboxmini/issues) page
2. 💡 Create a new issue if needed
3. 💬 Join our [Discord community](https://discord.gg/cuv3HtA55G)
4. 🗣️ Participate in [Discussions](https://github.com/mboxmini/mboxmini/discussions)

## 👏 Acknowledgments

- 🎮 [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server) for the excellent Minecraft server Docker image
- 🌟 The Minecraft community
- 💖 All our contributors

---
<p align="center">Made with ❤️ by the MboxMini Team</p>
