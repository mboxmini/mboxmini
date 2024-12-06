#!/bin/bash

# Get the absolute path of the workspace
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Set default values for required variables
export API_KEY="${API_KEY:-d7d5170736c5eadce6b2f242af9c330617548dfb6763b8df1edff26111439895}"
export API_PORT="${API_PORT:-8080}"
export MINECRAFT_PORT="${MINECRAFT_PORT:-25565}"
export MAX_MEMORY="${MAX_MEMORY:-2G}"
export HOST_DATA_PATH="${HOST_DATA_PATH:-${WORKSPACE_DIR}/minecraft-data}"

# Create data directory if it doesn't exist
mkdir -p "${HOST_DATA_PATH}"

# Print current environment settings
echo "Debug environment variables set:"
echo "==============================="
echo "API_KEY=${API_KEY}"
echo "API_PORT=${API_PORT}"
echo "MINECRAFT_PORT=${MINECRAFT_PORT}"
echo "MAX_MEMORY=${MAX_MEMORY}"
echo "HOST_DATA_PATH=${HOST_DATA_PATH}"
echo "==============================="

# Instructions for use
echo ""
echo "To use these variables in your current shell session, run:"
echo "source scripts/debug-env.sh"
echo ""
echo "To use with docker-compose, run:"
echo "source scripts/debug-env.sh && docker-compose up -d" 