# Smart Work Tracker - Automation Setup

**Status:** ✅ Fully Configured (January 26, 2026)

---

## A) ✅ Automated Task Updates (Cron Jobs)

### Daily Automatic Refresh (6:00 AM)

**Configured cron jobs:**
```cron
# Boot-time refresh (catches work from previous session before shutdown)
@reboot sleep 60 && cd /home/mp/awesome/smart-work-tracker && ./refresh-work.sh

# Daily scheduled refresh at 6:00 AM
0 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js parse
5 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js attribute
10 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js detect
```

### What Happens Automatically

**On every boot:**
- **~60 seconds after boot** - Full refresh (parse → attribute → detect)
  - Captures any work from previous session before shutdown
  - Ensures no work is missed if machine was off at 6 AM
  - Logs to: `/home/mp/awesome/smart-work-tracker/logs/boot-refresh.log`

**Every day at 6:00 AM:**
1. **6:00 AM** - Parse new Claude Code sessions
   - Scans `~/.claude/projects/` for new/updated sessions
   - Extracts work segments (start time, end time, duration)
   - Stores in database

2. **6:05 AM** - Attribute segments to projects
   - Matches working directory to ActiveCollab projects
   - Uses git branch names for attribution
   - Calculates confidence scores

3. **6:10 AM** - Detect task descriptions
   - Analyzes conversation content
   - Generates task descriptions
   - Updates database

**Logs stored in:**
- `/home/mp/awesome/smart-work-tracker/logs/parse.log`
- `/home/mp/awesome/smart-work-tracker/logs/attribute.log`
- `/home/mp/awesome/smart-work-tracker/logs/detect.log`

### Manual Refresh (Anytime)

**Quick refresh:**
```bash
cd /home/mp/awesome/smart-work-tracker
./refresh-work.sh
```

**Individual steps:**
```bash
node src/index.js parse      # Parse new sessions only
node src/index.js attribute  # Re-attribute existing segments
node src/index.js detect     # Re-detect task descriptions
```

### When to Manual Refresh

- ✅ During the day to see current progress
- ✅ Before reviewing work in dashboard
- ✅ Before submitting to ActiveCollab
- ✅ If you suspect cron didn't run (machine was off at 6 AM)

---

## B) ✅ Dashboard Auto-Start on Boot (PM2 + Systemd)

### Services Configured

**Two services auto-start on every boot:**

1. **smart-work-tracker-api** (Port 3001)
   - Express API server
   - Endpoints: /api/segments, /api/projects, /api/stats, /api/submit
   - Database: SQLite with WAL mode

2. **smart-work-tracker-ui** (Port 3000)
   - React frontend (Vite dev server)
   - Dashboard interface
   - Connects to API on port 3001

### Configuration Files

**PM2 Ecosystem:**
- `/home/mp/awesome/smart-work-tracker/ecosystem.config.cjs`

**Systemd Service:**
- `/etc/systemd/system/pm2-mp.service`
- Status: `enabled` (auto-start on boot)

**PM2 Process List:**
- Saved in: `/home/mp/.pm2/dump.pm2`
- Contains: All 8 PM2 services (super-agent + smart-work-tracker)

### What Happens on Boot

1. **System boots** → Ubuntu starts
2. **Systemd runs** → Starts `pm2-mp.service`
3. **PM2 resurrects** → Restarts all saved processes
4. **~30 seconds later** → Dashboard available at http://localhost:3000
5. **~60 seconds later** → Cron runs refresh-work.sh
   - Parses work from previous session before shutdown
   - Updates database with latest segments
   - Auto-attributes to projects
   - Detects task descriptions

### Verify Auto-Start

**Check PM2 service:**
```bash
systemctl status pm2-mp
```

**Check dashboard processes:**
```bash
pm2 list | grep smart-work-tracker
```

**Access dashboard:**
```
http://localhost:3000
```

---

## Complete Workflow

### Morning (First Thing)

**System boots automatically:**
1. ✅ PM2 starts all services
2. ✅ Dashboard available at http://localhost:3000
3. ✅ Boot-time refresh runs (~60 seconds after boot)
   - Captures work from previous session before shutdown
   - No manual action needed!
4. ✅ Daily cron ran at 6:00 AM (if machine was on)

**You can:**
- Open http://localhost:3000 right away (after ~90 seconds)
- Work is already parsed, attributed, and ready to review
- No need to run manual refresh unless you want to update again later

### During Day

**Check progress anytime:**
```bash
./refresh-work.sh           # Update database
# Then refresh browser at http://localhost:3000
```

**Quick check:**
```bash
node check-today.js         # CLI view of today's work
```

### End of Day

**Before submitting to ActiveCollab:**
```bash
./refresh-work.sh           # Final refresh
# Open http://localhost:3000
# Review, edit, approve segments
# Submit to ActiveCollab via dashboard
```

---

## PM2 Management Commands

### View All Services
```bash
pm2 list
```

### Dashboard Services Only
```bash
pm2 list | grep smart-work-tracker
```

### Logs
```bash
pm2 logs smart-work-tracker-ui     # Frontend logs
pm2 logs smart-work-tracker-api    # Backend API logs
pm2 logs --lines 100               # All logs (last 100 lines)
```

### Restart Services
```bash
pm2 restart smart-work-tracker-ui   # Restart frontend
pm2 restart smart-work-tracker-api  # Restart backend
pm2 restart all                     # Restart everything
```

### Stop Services (Temporary)
```bash
pm2 stop smart-work-tracker-ui
pm2 stop smart-work-tracker-api
```

### Start Services (If Stopped)
```bash
pm2 start smart-work-tracker-ui
pm2 start smart-work-tracker-api
```

### Save Changes (After Adding/Removing Services)
```bash
pm2 save   # Updates /home/mp/.pm2/dump.pm2
```

---

## Cron Management

### View Current Cron Jobs
```bash
crontab -l
```

### Edit Cron Jobs
```bash
crontab -e
```

### Disable Auto-Updates (If Needed)
```bash
crontab -e
# Comment out the 3 smart-work-tracker lines by adding # at the start
```

---

## Troubleshooting

### Dashboard Not Accessible After Boot

**Check if services are running:**
```bash
pm2 list | grep smart-work-tracker
```

**If not running, check PM2 service:**
```bash
systemctl status pm2-mp
```

**Manual start:**
```bash
pm2 resurrect
# or
cd /home/mp/awesome/smart-work-tracker
pm2 start ecosystem.config.cjs
```

### Cron Jobs Not Running

**Check cron logs:**
```bash
grep CRON /var/log/syslog | tail -20
```

**Check smart-work-tracker logs:**
```bash
tail -f /home/mp/awesome/smart-work-tracker/logs/parse.log
tail -f /home/mp/awesome/smart-work-tracker/logs/attribute.log
tail -f /home/mp/awesome/smart-work-tracker/logs/detect.log
```

**Test cron job manually:**
```bash
cd /home/mp/awesome/smart-work-tracker && node src/index.js parse
```

### No New Work Showing Up

**Refresh database:**
```bash
cd /home/mp/awesome/smart-work-tracker
./refresh-work.sh
```

**Check Claude session files exist:**
```bash
ls -lh ~/.claude/projects/*/
```

**Check database:**
```bash
node check-today.js
```

---

## Disable Auto-Start (If Needed)

### Disable Dashboard Auto-Start
```bash
pm2 delete smart-work-tracker-ui
pm2 delete smart-work-tracker-api
pm2 save
```

### Disable All PM2 Auto-Start
```bash
pm2 unstartup systemd
sudo systemctl disable pm2-mp
```

### Disable Cron Jobs
```bash
crontab -e
# Comment out smart-work-tracker lines
```

---

## Summary

| Feature | Status | Configuration |
|---------|--------|---------------|
| **Auto-parse new sessions** | ✅ Active | Cron (6:00 AM daily) |
| **Auto-attribute to projects** | ✅ Active | Cron (6:05 AM daily) |
| **Auto-detect task descriptions** | ✅ Active | Cron (6:10 AM daily) |
| **Dashboard auto-start on boot** | ✅ Active | PM2 + Systemd |
| **Manual refresh** | ✅ Available | `./refresh-work.sh` |

**Dashboard URL:** http://localhost:3000
**API URL:** http://localhost:3001

---

**Everything is fully automated and ready to use!**
