#!/bin/bash

# Configuration
API_URL="http://localhost:8080"
USERNAME="admin"
PASSWORD=""
TOKEN=""
API_KEY=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load credentials
load_credentials() {
    if [ -f "admin_credentials.txt" ]; then
        PASSWORD=$(grep "Password:" admin_credentials.txt | cut -d' ' -f2)
    else
        echo -e "${RED}Error: admin_credentials.txt not found${NC}"
        exit 1
    fi
}

# Login and get token
login() {
    echo -e "${GREEN}Logging in...${NC}"
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
        "$API_URL/api/auth/login")
    
    TOKEN=$(echo $response | jq -r '.token')
    API_KEY=$(echo $response | jq -r '.api_key')
    
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo -e "${RED}Login failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}Login successful${NC}"
}

# Helper function for API calls
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$TOKEN" ]; then
        login
    fi
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
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

# Main script
load_credentials

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