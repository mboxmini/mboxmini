#!/bin/bash

# Configuration
API_URL="http://localhost:8080"
API_KEY="your-secret-key"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function for API calls
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "X-API-Key: $API_KEY" \
            "$API_URL$endpoint"
    fi
    echo # New line after response
}

# Test server status
test_status() {
    echo -e "${GREEN}MboxMini - Testing server status...${NC}"
    call_api "GET" "/api/server/status"
}

# Start server
start_server() {
    echo -e "${GREEN}Starting server...${NC}"
    call_api "POST" "/api/server/start"
}

# Stop server
stop_server() {
    echo -e "${GREEN}Stopping server...${NC}"
    call_api "POST" "/api/server/stop"
}

# Get online players
get_players() {
    echo -e "${GREEN}Getting online players...${NC}"
    call_api "GET" "/api/server/players"
}

# Execute a command
execute_command() {
    local command=$1
    echo -e "${GREEN}Executing command: $command${NC}"
    call_api "POST" "/api/server/command" "{\"command\": \"$command\"}"
}

# Update server properties
update_config() {
    echo -e "${GREEN}Updating server configuration...${NC}"
    call_api "POST" "/api/server/config" '{
        "properties": {
            "max-players": "20",
            "difficulty": "normal",
            "pvp": "true"
        }
    }'
}

# Example usage
case "$1" in
    "status")
        test_status
        ;;
    "start")
        start_server
        ;;
    "stop")
        stop_server
        ;;
    "players")
        get_players
        ;;
    "command")
        if [ -z "$2" ]; then
            echo -e "${RED}Please provide a command${NC}"
            exit 1
        fi
        execute_command "$2"
        ;;
    "config")
        update_config
        ;;
    *)
        echo "Usage: $0 {status|start|stop|players|command <cmd>|config}"
        exit 1
        ;;
esac 