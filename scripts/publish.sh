#!/bin/bash

# Configuration
DOCKER_HUB_USERNAME="intecco"
VERSION="0.1.0"
UI_IMAGE="${DOCKER_HUB_USERNAME}/mboxmini-ui"
API_IMAGE="${DOCKER_HUB_USERNAME}/mboxmini-api"

# Function to check Docker login
check_docker_login() {
    echo "Checking Docker Hub authentication..."
    if ! docker info 2>/dev/null | grep "Username:" > /dev/null; then
        echo "Please log in to Docker Hub:"
        docker login
    fi
}

# Function to build and push an image
build_and_push() {
    local name=$1
    local path=$2
    local version=$3
    
    echo "Building $name image..."
    docker build -t "$name:$version" -t "$name:latest" "$path"
    
    if [ $? -eq 0 ]; then
        echo "Pushing $name:$version to Docker Hub..."
        docker push "$name:$version"
        docker push "$name:latest"
    else
        echo "Failed to build $name image"
        exit 1
    fi
}

# Main script
echo "Starting build and publish process for MBoxMini v${VERSION}..."

# Check Docker Hub authentication
check_docker_login

# Build and push UI
echo "Building and pushing UI..."
build_and_push "$UI_IMAGE" "./frontend" "$VERSION"

# Build and push API
echo "Building and pushing API..."
build_and_push "$API_IMAGE" "./backend" "$VERSION"

echo "Build and publish completed successfully!"
echo "Images published:"
echo "- $UI_IMAGE:$VERSION"
echo "- $UI_IMAGE:latest"
echo "- $API_IMAGE:$VERSION"
echo "- $API_IMAGE:latest"
echo ""
echo "To pull these images, use:"
echo "docker pull $UI_IMAGE:$VERSION"
echo "docker pull $API_IMAGE:$VERSION" 