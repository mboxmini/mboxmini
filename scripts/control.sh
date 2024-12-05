#!/bin/bash

# Service control functions
start_service() {
    case "$OSTYPE" in
        darwin*)
            launchctl load ~/Library/LaunchAgents/com.mboxmini.server.plist
            ;;
        linux*)
            sudo systemctl start mboxmini
            ;;
        msys*|cygwin*|mingw*)
            sc start MboxMini
            ;;
    esac
}

stop_service() {
    case "$OSTYPE" in
        darwin*)
            launchctl unload ~/Library/LaunchAgents/com.mboxmini.server.plist
            ;;
        linux*)
            sudo systemctl stop mboxmini
            ;;
        msys*|cygwin*|mingw*)
            sc stop MboxMini
            ;;
    esac
}

status_service() {
    case "$OSTYPE" in
        darwin*)
            launchctl list | grep com.mboxmini.server
            ;;
        linux*)
            sudo systemctl status mboxmini
            ;;
        msys*|cygwin*|mingw*)
            sc query MboxMini
            ;;
    esac
}

# Command handling
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 2
        start_service
        ;;
    status)
        status_service
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac 