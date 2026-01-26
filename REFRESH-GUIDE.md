# Smart Work Tracker - How to Refresh Dashboard

**Quick Answer:** Run the refresh script!

---

## 🚀 Quick Method (Recommended)

```bash
cd /home/mp/awesome/smart-work-tracker
./refresh-work.sh
```

**Then:** Refresh your browser at http://localhost:3000

---

## 📋 What the Refresh Does

### 1. **Parse** - Discover New Work Sessions
```bash
node src/index.js parse
```

**What it does:**
- Scans `~/.claude/projects/` for all Claude Code session files
- Detects new sessions created since last run
- Detects updated sessions (growing files as you work)
- Extracts work segments from conversations
- Calculates duration, working directory, git branch
- Stores in database

**Output:**
```
✓ Processed 4 sessions, skipped 55
Total time tracked: 7h 17m
```

### 2. **Attribute** - Match to Projects
```bash
node src/index.js attribute
```

**What it does:**
- Matches work segments to ActiveCollab projects
- Uses working directory paths (e.g., `/home/mp/awesome/b3x-client-reports/clients/empower-home-services/` → "Empower Home Services")
- Uses git branch names
- Calculates confidence scores
- Updates `project_id_final` in database

**Output:**
```
Attributed 12 segments to projects
- Empower Home Services: 5 segments
- Bearcat Mindset: 3 segments
- Breakthrough3x: 4 segments
```

### 3. **Detect** - Auto-Detect Task Descriptions
```bash
node src/index.js detect
```

**What it does:**
- Analyzes conversation content
- Generates task descriptions (e.g., "Landing Pages - GBP Reviews Integration")
- Uses AI/heuristics to detect task type
- Updates `task_description` in database

**Output:**
```
Detected tasks for 12 segments
- "Built transcript archive system"
- "Updated landing pages with reviews"
- "Created Slack bot proposal"
```

---

## ⏰ Automatic Daily Refresh (Already Running)

**Cron jobs run daily at 6:00 AM:**
```cron
0 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js parse
5 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js attribute
10 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js detect
```

**WSL2 Note:** If your machine was asleep/off at 6 AM, cron won't run. Just run `./refresh-work.sh` manually when you start working.

---

## 🔄 When to Manually Refresh

**Refresh during the day when:**
- ✅ You want to check today's tracked time
- ✅ Before submitting to ActiveCollab
- ✅ After completing a major task
- ✅ Before end of day
- ✅ If you suspect cron didn't run

**How often?** As needed - it's fast (~5-10 seconds)

---

## 📊 Dashboard Updates

**After running refresh:**

1. **Database is updated** with new segments
2. **Dashboard needs browser refresh** to show changes
   - The dashboard is a React app that fetches data on load
   - Click browser refresh button (F5) to see new data

**The dashboard does NOT auto-refresh** (by design - prevents disruption while reviewing)

---

## 🧪 Individual Commands (Advanced)

### Parse Only (Check for New Sessions)
```bash
cd /home/mp/awesome/smart-work-tracker
node src/index.js parse
```

Use when: You just finished working and want to see raw time tracked

### Attribute Only (Match to Projects)
```bash
node src/index.js attribute
```

Use when: You've already parsed but want to re-match to projects (maybe after updating project list)

### Detect Only (Generate Task Descriptions)
```bash
node src/index.js detect
```

Use when: You want to regenerate task descriptions with updated logic

---

## 🔍 Check What's Tracked

### View Recent Work
```bash
cd /home/mp/awesome/smart-work-tracker
node check-today.js
```

**Output:**
```
📅 Work Tracked Today (January 26, 2026):

[1] 2026-01-26 18:30:00 | 45m | ⏳ Pending
    Project: Empower Home Services
    Task: Landing pages with GBP reviews
    ID: 123

Total time today: 8.00 hours (480 minutes)
```

### Check Unbilled Hours
```bash
node check-unbilled-hours.js
```

Shows unbilled hours per project in ActiveCollab

---

## 🗄️ Database Location

**File:** `/home/mp/awesome/smart-work-tracker/smart-work-tracker.db` (old location)
**New:** `/home/mp/awesome/smart-work-tracker/data/smart-work-tracker.db` (newer versions)

**Tables:**
- `sources` - Claude session files
- `segments` - Individual work segments
- `projects` - ActiveCollab project cache

---

## 🔧 Troubleshooting

### "No new work tracked"

**Check if sessions exist:**
```bash
ls -lh ~/.claude/projects/-home-mp-awesome-super-agent/*.jsonl
```

**Check last parse time:**
```bash
cat /home/mp/awesome/smart-work-tracker/data/.last-parse 2>/dev/null
```

### "Database error"

**Check database path:**
```bash
ls -lh /home/mp/awesome/smart-work-tracker/*.db
ls -lh /home/mp/awesome/smart-work-tracker/data/*.db
```

### "Can't attribute to projects"

**Refresh ActiveCollab project cache:**
```bash
cd /home/mp/awesome/smart-work-tracker
node scripts/sync-projects.js
```

---

## 📝 Typical Daily Workflow

### Morning:
```bash
# Check what was tracked overnight (if you left Claude running)
cd /home/mp/awesome/smart-work-tracker
./refresh-work.sh
```

### During Day:
```bash
# Refresh periodically to see progress
./refresh-work.sh
```

### End of Day:
```bash
# Final refresh before submitting
./refresh-work.sh

# Open dashboard
# http://localhost:3000

# Review, approve, submit to ActiveCollab
```

---

## 🎯 Quick Reference

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `./refresh-work.sh` | Full refresh (all 3 steps) | Most of the time |
| `node src/index.js parse` | Parse new sessions | Just check time |
| `node src/index.js attribute` | Match to projects | Re-attribute |
| `node src/index.js detect` | Generate descriptions | Re-detect tasks |
| `node check-today.js` | View today's work | Quick summary |
| `node check-unbilled-hours.js` | Check unbilled | Before invoicing |

---

## 💡 Pro Tips

1. **Refresh before reviewing** - Always refresh before opening dashboard to ensure latest data

2. **Refresh is fast** - Takes 5-10 seconds, safe to run frequently

3. **Multiple refreshes OK** - Idempotent - won't duplicate data

4. **Browser refresh needed** - Dashboard won't auto-update, must refresh browser

5. **Cron handles most cases** - Daily cron usually sufficient, manual refresh for same-day updates

---

## 🔗 Related Files

- **Refresh Script:** `/home/mp/awesome/smart-work-tracker/refresh-work.sh`
- **Main README:** `/home/mp/awesome/smart-work-tracker/README.md`
- **Cron Setup:** Check with `crontab -l`
- **Dashboard:** http://localhost:3000

---

**Remember:** Parse → Attribute → Detect → Refresh Browser → Review Dashboard
