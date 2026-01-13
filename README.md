# Smart Work Tracker

Automatically track work time from Claude Code CLI sessions and sync to ActiveCollab.

## Features

- ✅ **Automatic Session Discovery** - Recursively scans all Claude session files including subagents
- ✅ **Growing Session Detection** - Automatically reprocesses files when they change
- ✅ **Work Segmentation** - Intelligently breaks sessions into billable work segments
- ✅ **Project Attribution** - Matches work to projects based on directory and context
- ✅ **Privacy Protection** - Redacts sensitive data before storage
- ✅ **ActiveCollab Sync** - Submit time entries automatically
- ✅ **Cron Automation** - Scheduled daily processing

## Quick Start

### Installation

```bash
cd /home/mp/awesome/smart-work-tracker
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure ActiveCollab credentials in `.env`:
```
ACTIVECOLLAB_URL=https://your-instance.activecollab.com
ACTIVECOLLAB_TOKEN=your-api-token
ACTIVECOLLAB_USER_ID=123
```

3. Initialize database:
```bash
node src/index.js migrate
```

### Daily Workflow

#### Option 1: Automated (Cron - Recommended)

Cronjobs run daily at 6:00 AM:
```cron
0 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js parse
5 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js attribute
10 6 * * * cd /home/mp/awesome/smart-work-tracker && node src/index.js detect
```

**WSL2 Note:** Cron may not run if system was asleep/hibernated at 6 AM. If you suspect cron didn't run, manually trigger:

```bash
cd /home/mp/awesome/smart-work-tracker
node src/index.js parse
```

#### Option 2: Manual

Run when you start working:
```bash
cd /home/mp/awesome/smart-work-tracker
node src/index.js parse       # Discover and parse sessions
node src/index.js attribute   # Match to projects
node src/index.js detect      # Detect task types
```

### Check Tracked Time

```bash
# See recent work
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/smart-work-tracker.db');
db.all(\`
  SELECT DATE(start_time) as date,
         COUNT(*) as segments,
         ROUND(SUM(COALESCE(adjusted_duration_minutes, duration_minutes))/60.0, 2) as hours
  FROM segments
  WHERE DATE(start_time) >= date('now', '-7 days')
  GROUP BY DATE(start_time)
  ORDER BY date DESC
\`, (e, rows) => {
  console.log('\\nWork Summary (Last 7 Days):\\n');
  rows.forEach(r => console.log(\`\${r.date}: \${r.segments} segments, \${r.hours}h\`));
  db.close();
});
"
```

## Commands

### Core Commands

- `node src/index.js parse` - Discover and parse Claude session files
- `node src/index.js attribute` - Match segments to projects
- `node src/index.js detect` - Auto-detect task descriptions
- `node src/index.js status` - Show current tracker status

### Advanced Commands

- `node src/index.js sync-projects` - Sync projects from ActiveCollab
- `node src/index.js adjust-durations` - Round durations to 30-min increments
- `node src/index.js submit-time` - Submit time records to ActiveCollab
- `node src/index.js submit-time --dry-run` - Preview submission
- `node src/index.js migrate` - Run database migrations

## How It Works

### 1. Session Discovery

Scans `~/.claude/projects/` recursively for all `.jsonl` session files:
```
~/.claude/projects/
├── -home-mp-awesome-super-agent/
│   ├── 7d1eab25-bc12-4c5b-80de-899bc5803ae1.jsonl       ← Main session
│   └── 7d1eab25-bc12-4c5b-80de-899bc5803ae1/
│       └── subagents/
│           ├── agent-a286bdd.jsonl                       ← Subagent session
│           └── agent-ab6a5bc.jsonl                       ← Subagent session
└── -home-mp-awesome-b3x-client-reports/
    └── session-xyz.jsonl
```

**All files are discovered**, including nested subagent sessions.

### 2. File Hash Tracking

Each session file is hashed (SHA-256). On subsequent runs:
- **Same hash** → Skip (already processed)
- **Different hash** → Reprocess (file has grown or changed)

This ensures growing session files (like multi-day conversations) are automatically updated.

### 3. Work Segmentation

Sessions are broken into work segments based on:
- Time gaps (>15 minutes = new segment)
- Activity patterns
- Tool usage

### 4. Project Attribution

Segments are matched to projects based on:
- Working directory (cwd)
- File paths
- Project keywords in context

### 5. Time Adjustment

Durations are rounded to 30-minute increments (billable standard):
- 1-15 minutes → 30 minutes
- 16-45 minutes → 30 minutes
- 46-75 minutes → 1 hour
- etc.

## Recent Fixes (Jan 13, 2026)

### ✅ Critical Issue: Subagent Sessions Not Tracked

**Problem:** Only discovered ~62 session files, missing 18+ subagent sessions in subdirectories.

**Fix:** Implemented recursive directory scanning. Now discovers 80+ files.

**Impact:** Jan 12 showed 30 minutes → Now shows 9 hours (accurate).

### ✅ Critical Issue: Growing Sessions Not Updated

**Problem:** Multi-day sessions only processed once. As files grew, new work wasn't tracked.

**Fix:** File hash detection now triggers reprocessing when sessions change.

**Impact:** Main session 27MB conversation now updates automatically.

See [CHANGELOG.md](./CHANGELOG.md) for complete details.

## Troubleshooting

### "No work tracked for yesterday"

**Cause:** WSL2 cron didn't run (system asleep at 6 AM).

**Fix:** Manually run:
```bash
cd /home/mp/awesome/smart-work-tracker && node src/index.js parse
```

### "Session already processed, skipping" (but file has grown)

**Should not happen after Jan 13 fix.** If it does:
1. Check file hash in database
2. Verify file size has actually changed
3. Report issue

### Cron not running

Verify cron is active:
```bash
systemctl status cron
```

If inactive:
```bash
sudo service cron start
```

Add to `~/.bashrc` for auto-start:
```bash
if ! pgrep -x "cron" > /dev/null; then
    sudo service cron start 2>/dev/null
fi
```

## Project Structure

```
smart-work-tracker/
├── src/
│   ├── index.js                          # CLI entry point
│   ├── cli/
│   │   └── commands.js                   # Command handlers
│   ├── lib/
│   │   ├── session-processor.js          # Session discovery & parsing ⭐
│   │   ├── session-segmenter.js          # Work segmentation logic
│   │   ├── attributor.js                 # Project matching
│   │   ├── task-detector.js              # Task description detection
│   │   ├── duration-adjuster.js          # Time rounding
│   │   └── time-submitter.js             # ActiveCollab sync
│   └── parsers/
│       ├── jsonl-parser.js               # JSONL file reading
│       └── privacy-redactor.js           # Sensitive data removal
├── migrations/                            # Database schema
├── data/
│   └── smart-work-tracker.db             # SQLite database
├── logs/
│   ├── combined.log                      # All logs
│   ├── error.log                         # Error logs
│   ├── parse.log                         # Cron: parse output
│   ├── attribute.log                     # Cron: attribute output
│   └── detect.log                        # Cron: detect output
├── config.js                             # Configuration
├── .env                                  # Environment variables (gitignored)
├── CHANGELOG.md                          # Version history
└── README.md                             # This file
```

## Database Schema

### `sources` - Session files
- `session_id` - UUID from filename
- `file_path` - Full path to .jsonl file
- `file_hash` - SHA-256 hash (detects changes)
- `file_size` - Size in bytes
- `processed_at` - Last processing timestamp

### `segments` - Work blocks
- `source_id` - Foreign key to sources
- `start_time` - Segment start
- `end_time` - Segment end
- `duration_minutes` - Original duration
- `adjusted_duration_minutes` - Rounded duration
- `project_id_final` - Matched project
- `task_description` - Auto-detected or manual
- `cwd` - Working directory
- `files_touched` - Files modified (JSON array)
- `commands_run` - Commands executed (JSON array)
- `status` - pending | approved | submitted

### `projects` - ActiveCollab projects
- Synced from ActiveCollab API
- Used for project attribution

## License

MIT

## Support

For issues or questions:
1. Check [CHANGELOG.md](./CHANGELOG.md) for recent fixes
2. Review troubleshooting section above
3. Check logs in `logs/` directory
4. Submit issue with relevant log excerpts
