#!/bin/bash

# Exit on error
set -e

# Read version
VERSION=$(cat version.txt)
DOCKER_REPO="intecco/mboxmini"

# Enable Docker BuildKit
export DOCKER_BUILDKIT=1

# Create builder instance
docker buildx create --name mboxmini-builder --use || true

# Build frontend for multiple platforms
echo "Building frontend image..."
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/386 \
  --tag "${DOCKER_REPO}/frontend:${VERSION}" \
  --tag "${DOCKER_REPO}/frontend:latest" \
  --push \
  -f frontend/Dockerfile \
  frontend

# Build backend for multiple platforms
echo "Building backend image..."
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/386 \
  --tag "${DOCKER_REPO}/backend:${VERSION}" \
  --tag "${DOCKER_REPO}/backend:latest" \
  --push \
  -f backend/Dockerfile \
  backend

echo "Build completed successfully!"
echo "Images pushed to Docker Hub:"
echo "- ${DOCKER_REPO}/frontend:${VERSION}"
echo "- ${DOCKER_REPO}/frontend:latest"
echo "- ${DOCKER_REPO}/backend:${VERSION}"
echo "- ${DOCKER_REPO}/backend:latest" 