# HEARTBEAT.md Template

```markdown
# Heartbeat Tasks

## Meridian Agent Monitor
- Check if Meridian screen session is alive: `screen -ls | grep meridian`
- If dead, restart: `screen -S meridian -X quit; screen -dmS meridian; screen -S meridian -X stuff "cd /home/ubuntu/.openclaw/skills/meridian && npm start\n"`
- Check cron log: `/home/ubuntu/.openclaw/workspace/monitor.log`

## Dashboard Monitor  
- Check if dashboard is running: `curl -s http://localhost:3000/api/wallet`
- If dead: `cd /home/ubuntu/.openclaw/workspace/meridian-dashboard && node server.js &`

## BlokD App
- Check if BlokD server running: `curl -s http://localhost:3001/api/stats`
- If dead: `cd /home/ubuntu/.openclaw/workspace/blokd-app && node server.js &`

# Add tasks below when you want the agent to check something periodically.
```
