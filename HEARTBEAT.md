# HEARTBEAT.md Template

```markdown
# Heartbeat Tasks

## Meridian Agent Monitor
# DISABLED - manual start only
# To start manually: screen -dmS meridian && screen -S meridian -X stuff "cd ~/.openclaw/skills/meridian && npm start\n"

## Dashboard Monitor  
- Check if dashboard is running: `curl -s http://localhost:3000/api/wallet`
- If dead: `cd /home/ubuntu/.openclaw/workspace/meridian-dashboard && node server.js &`

## BlokD App
- Check if BlokD server running: `curl -s http://localhost:3001/api/stats`
- If dead: `cd /home/ubuntu/.openclaw/workspace/blokd-app && node server.js &`

# Add tasks below when you want the agent to check something periodically.
```
