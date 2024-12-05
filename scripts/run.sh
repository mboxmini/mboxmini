#!/bin/bash

# Load environment variables
load_env() {
    local env_file=""
    case "$OSTYPE" in
        darwin*)  env_file="./scripts/config/mac.env" ;;
        linux*)   env_file="./scripts/config/linux.env" ;;
        msys*|cygwin*|mingw*) env_file="./scripts/config/windows.env" ;;
    esac

    if [ -f "$env_file" ]; then
        export $(cat "$env_file" | xargs)
    else
        echo "Environment file not found: $env_file"
        exit 1
    fi
}

# Start the server
start_server() {
    load_env
    cd "$(dirname "$0")/.."
    ./server
}

start_server 