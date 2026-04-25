#!/bin/bash
# Auto-restart Meridian if killed

SCREEN_NAME="meridian"
MERIDIAN_DIR="/home/ubuntu/.openclaw/skills/meridian"

# Check if screen session exists
if ! screen -ls | grep -q "$SCREEN_NAME.*Detached"; then
    echo "[$(date)] Meridian dead — restarting..."
    cd $MERIDIAN_DIR
    screen -dmS $SCREEN_NAME
    sleep 1
    screen -S $SCREEN_NAME -X stuff "cd $MERIDIAN_DIR && npm start\n"
    echo "[$(date)] Meridian restarted"
else
    echo "[$(date)] Meridian alive — no action needed"
fi
