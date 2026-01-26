# Smart Work Tracker - Auto-Start on Boot Setup

**Date:** January 26, 2026
**Status:** ✅ Dashboard configured and running

---

## ✅ What's Already Done

1. ✅ **API Server** running on port 3001 (`smart-work-tracker-api`)
2. ✅ **Frontend UI** running on port 3000 (`smart-work-tracker-ui`)
3. ✅ PM2 configuration saved
4. ✅ Database connected

---

## ⏳ What You Need to Do (One-Time Setup)

### Run This Command Once:

```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u mp --hp /home/mp
```

**What this does:**
- Creates a systemd service that starts PM2 on boot
- PM2 will then auto-start all saved processes (including the dashboard)
- Only needs to be run once

### After Running the Command:

PM2 will automatically start on every boot, and the dashboard will be available at http://localhost:3000

---

## 🧪 Test It Works

### Check Dashboard is Running Now:
```bash
pm2 list
# Should show smart-work-tracker-ui as "online"
```

### Access Dashboard:
```
http://localhost:3000
```

### After Next Reboot:
1. Wait ~30 seconds after login
2. Open http://localhost:3000
3. Dashboard should be running automatically

---

## 📊 All PM2 Services (Auto-Start on Boot)

After setup, these services will auto-start:
- ✅ `send-service` - Super-agent message sender (Hetzner)
- ✅ `send-service-local` - Super-agent message sender (WSL2)
- ✅ `response-fetcher` - Response watcher (Hetzner)
- ✅ `response-fetcher-local` - Response watcher (WSL2)
- ✅ `local-response-watcher` - Local response handler
- ✅ `task-watcher` - Task queue monitor
- ✅ `smart-work-tracker-ui` - Work tracker dashboard (NEW!)

---

## 🔧 Useful PM2 Commands

```bash
# View all services
pm2 list

# View dashboard logs
pm2 logs smart-work-tracker-ui

# Restart dashboard
pm2 restart smart-work-tracker-ui

# Stop dashboard
pm2 stop smart-work-tracker-ui

# Start dashboard (if stopped)
pm2 start smart-work-tracker-ui

# Save current state (after any changes)
pm2 save
```

---

## 🚀 Dashboard Features

Once running, access at http://localhost:3000 to:

1. **View Today's Work** - All tracked segments for today
2. **Review & Edit** - Edit task descriptions before submitting
3. **Approve/Skip** - Approve segments for billing or skip non-billable work
4. **Submit to ActiveCollab** - Batch submit approved time entries
5. **Dashboard Stats** - View time by project, unbilled hours, etc.

---

## 📁 Files

- **PM2 Config:** `/home/mp/awesome/smart-work-tracker/web-ui/ecosystem.config.cjs`
- **Vite Config:** `/home/mp/awesome/smart-work-tracker/web-ui/vite.config.js`
- **Logs:** `/home/mp/awesome/smart-work-tracker/logs/web-ui-*.log`

---

## ✅ Verification

**Current Status:**
```bash
pm2 list | grep smart-work-tracker-ui
# Should show: online, uptime, port 3001
```

**Dashboard Accessible:**
```bash
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK
```

---

## 🔄 If You Need to Disable Auto-Start

```bash
# Remove from PM2
pm2 delete smart-work-tracker-ui
pm2 save

# Disable all PM2 auto-start (if needed)
pm2 unstartup systemd
```

---

**Ready!** Just run the `sudo pm2 startup` command above once, and you're all set.
