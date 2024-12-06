#!/bin/bash

# Function to get environment file
get_env_file() {
    local env_file=""
    case "$OSTYPE" in
        darwin*)  env_file="./scripts/config/mac.env" ;;
        linux*)   env_file="./scripts/config/linux.env" ;;
        msys*|cygwin*|mingw*) env_file="./scripts/config/windows.env" ;;
        *) echo "Unknown platform: $OSTYPE" >&2; exit 1 ;;
    esac
    echo "$env_file"
}

# Function to load environment variables
load_env() {
    local env_file="$1"
    echo "Loading environment from $env_file" >&2
    
    if [ ! -f "$env_file" ]; then
        echo "Error: Environment file not found: $env_file" >&2
        exit 1
    fi
    
    # Read the env file line by line
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
            continue
        fi
        # Export the variable
        export "$line"
    done < "$env_file"
}

# Function to stop services
stop_services() {
    local env_file="$1"
    echo "Stopping services..." >&2
    
    # Load environment variables
    load_env "$env_file"
    
    # Verify HOST_DATA_PATH is set
    if [ -z "$HOST_DATA_PATH" ]; then
        echo "Error: HOST_DATA_PATH is not set!" >&2
        exit 1
    fi
    
    # Stop all services
    docker-compose down
}

# Main script
echo "Stopping MboxMini..." >&2

# Get environment file
env_file=$(get_env_file)

# Stop all services
stop_services "$env_file"

echo "All services stopped successfully!" >&2 