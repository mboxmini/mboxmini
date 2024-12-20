#!/bin/bash

# Function to check if setup is complete
check_setup() {
    local env_file=""
    case "$OSTYPE" in
        darwin*)  env_file="./scripts/config/mac.env" ;;
        linux*)   env_file="./scripts/config/linux.env" ;;
        msys*|cygwin*|mingw*) env_file="./scripts/config/windows.env" ;;
        *) echo "Unknown platform: $OSTYPE" >&2; exit 1 ;;
    esac

    if [ ! -f "$env_file" ] || [ ! -f "frontend/.env" ]; then
        echo "Environment files not found. Running setup..." >&2
        ./scripts/setup.sh
    else
        echo "Setup verified." >&2
    fi

    # Return the env file path
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

# Function to check and install dependencies
check_dependencies() {
    echo "Checking dependencies..." >&2
    
    # Check backend dependencies
    cd backend
    if ! go mod tidy; then
        echo "Error: Failed to update Go dependencies" >&2
        exit 1
    fi
    cd ..

    # Check frontend dependencies
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..." >&2
        if ! npm install; then
            echo "Error: Failed to install frontend dependencies" >&2
            exit 1
        fi
    fi
    cd ..
}

# Function to start services
start_services() {
    local env_file="$1"
    echo "Starting services..." >&2

    # Load environment variables
    load_env "$env_file"

    # Verify HOST_DATA_PATH is set
    if [ -z "$HOST_DATA_PATH" ]; then
        echo "Error: HOST_DATA_PATH is not set!" >&2
        exit 1
    fi
    echo "Using HOST_DATA_PATH: $HOST_DATA_PATH" >&2

    # Create data directory if it doesn't exist
    mkdir -p "$HOST_DATA_PATH"

    # Start all services with docker-compose
    echo "Starting services..." >&2
    if ! docker-compose up -d --build; then
        echo "Error: Failed to start services" >&2
        docker-compose logs
        exit 1
    fi

    # Wait for API to be ready
    echo "Waiting for API to be ready..." >&2
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null; then
            echo "API is ready!" >&2
            break
        fi
        if [ $i -eq 30 ]; then
            echo "Error: API failed to start" >&2
            docker-compose logs
            exit 1
        fi
        echo "Waiting for API... ($i/30)" >&2
        sleep 1
    done

    echo "All services started!" >&2
    echo "Frontend: http://localhost:3000" >&2
    echo "Backend API: http://localhost:8080" >&2
}

# Main script
echo "Starting MboxMini..." >&2

# Check if setup is complete and get env file path
env_file=$(check_setup)

# Check dependencies
check_dependencies

# Start all services with env file
start_services "$env_file"

echo "MboxMini is now running!" >&2 