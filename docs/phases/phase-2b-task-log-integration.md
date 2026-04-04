# Phase 2B: Task Log Integration

**Created:** 2026-01-11
**Status:** 📝 In Progress

---

## Objective

Enhance project attribution by integrating super-agent task logs, which contain rich client work context that file/command analysis alone cannot capture.

**Deliverable:** An enhanced attribution system that analyzes remote task descriptions and responses to accurately track client project work, even when performed from non-client directories (e.g., super-agent).

---

## Problem Statement

**Current Limitation:**
Phase 2's attribution engine only analyzes:
- CWD (current working directory)
- Files touched during work session
- Commands run during work session

**What's Missing:**
When using super-agent to delegate work to remote Claude, the local work session shows:
- CWD: `/home/mp/awesome/super-agent` (internal tool, not client project)
- Files: mostly `tasks/*.json` files
- Commands: `./scripts/add-task.sh`, SSH commands

**The Problem:**
- ❌ 5h 12m of work was marked "Unknown" because it was done via super-agent
- ❌ Cannot track remote work without analyzing task content
- ❌ Missing rich context in task descriptions (client names, project names, specific deliverables)

**The Solution:**
Analyze super-agent task logs (`tasks/responses/archive/*.json`) which contain:
- Explicit client names in task descriptions
- Project-specific keywords
- Detailed work context
- Actual deliverables produced

---

## Scope

### In Scope
- Read and parse super-agent task response files
- Extract task timestamps, descriptions, and responses
- Match tasks to ActiveCollab projects using keywords
- Link segments to related tasks based on timestamp proximity
- Store task context in segments table
- Enhanced attribution using task log data
- Filter out false positives (generic keywords like "plumbing", "electric")

### Out of Scope
- AI-based task analysis (Phase 3B)
- Real-time task monitoring
- Task queue integration (only archived responses)
- Multi-remote support (only super-agent for now)

---

## Requirements

### Functional Requirements
1. **Must** read task response files from `~/awesome/super-agent/tasks/responses/archive/`
2. **Must** parse JSON task format: `{ id, task, response, fetchedAt }`
3. **Must** match tasks to projects using existing project keywords
4. **Must** link segments to tasks based on timestamp proximity (±30 min window)
5. **Must** store task IDs and summaries in `task_context` field
6. **Must** filter out false positives (generic technical keywords)
7. **Must** re-attribute "Unknown" segments using task log evidence

### Non-Functional Requirements
1. **Performance:** Process 400+ task files in <5 seconds
2. **Accuracy:** >90% correct task-to-project matching
3. **Maintainability:** Easy to add new task log sources (future: other remotes)

---

## Data Structures

### Task Response File Format

**Location:** `~/awesome/super-agent/tasks/responses/archive/{timestamp}.json`

```json
{
  "id": 1768078377612,
  "task": "URGENT CLIENT QUESTION - EMPOWER GBP AUDIT FOLLOW-UP...",
  "response": "**Empower Multi-Location GBP Content - COMPLETE**...",
  "fetchedAt": "2026-01-10T20:57:05.400Z"
}
```

### Enhanced Segment Schema

```sql
ALTER TABLE segments ADD COLUMN task_context TEXT;
```

**task_context format (JSON):**
```json
{
  "taskIds": [1768078377612, 1768077768181],
  "taskSummaries": [
    "Empower GBP audit follow-up - multi-location content",
    "Generated GBP audit report"
  ],
  "matchedProjects": [
    {"id": 2, "name": "Empower Solar/Homes", "confidence": 0.95}
  ]
}
```

---

## Implementation Plan

### Step 1: Add task_context Column

**Migration:** `011-add-task-context.sql`

```sql
ALTER TABLE segments ADD COLUMN task_context TEXT;
```

### Step 2: Create Task Log Analyzer Module

**File:** `src/lib/task-log-analyzer.js`

**Responsibilities:**
- Read and parse task response files from super-agent directory
- Extract client keywords from task descriptions
- Match tasks to ActiveCollab projects
- Calculate match confidence
- Link tasks to segments based on timestamp proximity

**Key Methods:**
```javascript
class TaskLogAnalyzer {
  constructor(db, logger, config) {
    this.taskLogDir = '/home/mp/awesome/super-agent/tasks/responses/archive';
    this.dateCutoff = new Date('2026-01-09'); // Same as session parser
  }

  async loadTaskLogs() {
    // Read all task JSON files after dateCutoff
    // Returns: [{id, timestamp, task, response, date}]
  }

  matchTasksToProjects(tasks, projects) {
    // Match task text to project keywords
    // Returns: [{task, project, confidence, matches}]
  }

  linkTasksToSegments(tasks, segments) {
    // Link tasks to segments within ±30 min window
    // Returns: [{segment, linkedTasks: [...]}]
  }

  filterFalsePositives(matches) {
    // Remove matches on generic keywords in wrong context
    // Example: "plumbing" in "1stchoiceplumbingheatingandairconditioning" != plumbing-connection.com
  }
}
```

### Step 3: Enhance Attribution Engine

**Update:** `src/lib/attributor.js`

Add task log matching as **Rule 6** (highest priority):

```javascript
calculateConfidence(segment, project, taskContext) {
  let confidence = 0;

  // RULE 6: Task log matching (NEW - HIGHEST PRIORITY)
  if (taskContext && taskContext.matchedProjects) {
    const taskMatch = taskContext.matchedProjects.find(
      p => p.id === project.id
    );
    if (taskMatch) {
      return Math.max(confidence, taskMatch.confidence); // 0.8-0.95
    }
  }

  // Existing rules 1-5...
}
```

### Step 4: Add CLI Command

**Command:** `npm start link-tasks`

**Functionality:**
1. Load all task logs from super-agent
2. Match tasks to projects
3. Link tasks to segments by timestamp
4. Update segments with task_context
5. Re-run attribution using enhanced data

### Step 5: Enhanced Status Report

**Command:** `npm start report`

**Output:**
- Client work summary from last N days
- Time breakdown by project
- Task-based vs CWD-based attribution stats
- List of tasks per project
- Unknown/unattributed time

---

## Attribution Rules (Enhanced)

### Priority Order:

1. **Task Log Match** (confidence 0.8-0.95)
   - Explicit client name in task description
   - Project-specific keywords (non-generic)
   - Timestamp proximity to segment

2. **Exact CWD Match** (confidence 1.0)
   - `/home/mp/awesome/client-project`

3. **CWD Substring Match** (confidence 0.9)
   - CWD contains project pattern

4. **File/Command Keywords** (confidence 0.6-0.8)
   - Project keywords in files touched or commands run

5. **CWD Keywords** (confidence 0.7)
   - Keywords in current directory

### False Positive Filters:

**Generic Technical Keywords (Do NOT match):**
- "plumbing", "electric", "heating", "hvac" - only match if combined with specific company name
- "connection", "service", "solutions" - too generic
- "phoenix", "hall" - only match when in correct context (Dr. Hall's projects)

**Specific Match Required:**
- "plumbing-connection.com" - exact domain match
- "echelon electric" - both words together
- "pearcehvac" - unique company identifier

---

## Testing Strategy

### Test Cases

**Test 1: Empower GBP Audit Work**
- Input: Segment from Jan 10, 9:34 PM (28 min)
- Task Log: "URGENT CLIENT QUESTION - EMPOWER GBP AUDIT..."
- Expected: Attribute to "Empower Solar/Homes" with confidence 0.95

**Test 2: Gshomeservices HVAC Research**
- Input: Segment from Jan 9, 2:00 PM (multiple tasks)
- Task Logs: 8 tasks mentioning "gshomeservices"
- Expected: Attribute to "Gshomeservices" with confidence 0.90

**Test 3: False Positive - Plumbing Keyword**
- Input: Task mentioning "1stchoiceplumbingheatingandairconditioning"
- Should NOT match: "plumbing-connection.com"
- Expected: No match or very low confidence (<0.3)

**Test 4: Echelon Electric Real Work**
- Input: Task "Run SERP search for Brick, NJ... client echelonelectricnj.com"
- Expected: Attribute to "echelonelectricnj.com" with confidence 0.90

---

## Migration: 011-add-task-context

**Up:**
```sql
-- Add task context field to segments table
ALTER TABLE segments ADD COLUMN task_context TEXT;
```

**Down:**
```sql
-- SQLite doesn't support DROP COLUMN
-- Recreate table without task_context (if needed for rollback)
CREATE TABLE segments_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  adjusted_duration_minutes INTEGER,
  cwd TEXT,
  git_branch TEXT,
  project_id_detected INTEGER,
  project_id_final INTEGER,
  confidence_score REAL,
  task_description TEXT,
  work_summary TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  files_touched TEXT,
  commands_run TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

INSERT INTO segments_temp
SELECT
  id, source_id, start_time, end_time, duration_minutes,
  adjusted_duration_minutes, cwd, git_branch, project_id_detected,
  project_id_final, confidence_score, task_description, work_summary,
  status, created_at, updated_at, files_touched, commands_run
FROM segments;

DROP TABLE segments;
ALTER TABLE segments_temp RENAME TO segments;
```

---

## Success Criteria

✅ **Phase 2B Complete when:**
1. Migration 011 applied successfully
2. Task log analyzer implemented and tested
3. Attribution engine enhanced with task log matching
4. CLI `link-tasks` command working
5. Successfully re-attributed "Unknown" segments using task logs
6. False positives filtered out (plumbing-connection.com, etc.)
7. Comprehensive client work report generated
8. Accuracy: >90% of client work correctly attributed

---

## Expected Results

**Before Phase 2B:**
- Empower: 0h 28m (1 segment)
- pearcehvac: 1h 8m
- BreakThrough3x: 0h 22m
- Unknown: 5h 12m ⚠️

**After Phase 2B (Expected):**
- Empower Solar/Homes: ~1h+ (task logs show 2+ tasks)
- Gshomeservices: ~2h+ (task logs show 8 tasks)
- echelonelectricnj.com: ~1h+ (task logs show 4 tasks)
- BreakThrough3x: ~1h (task logs show 3 tasks)
- pearcehvac: ~1h 8m
- Unknown: <1h (significantly reduced)

---

## Notes

**Design Decisions:**
- Task-to-segment linking uses ±30 min window (configurable)
- Task log matching takes priority over CWD matching for super-agent work
- Store full task context as JSON for future AI enhancement (Phase 3B)
- Support only super-agent for v1 (can extend to other remotes later)

**Risks:**
- Task timestamp might not perfectly align with actual work time
- Some tasks span multiple segments (handle via time window)
- False positives on generic keywords (mitigated with filters)

**Assumptions:**
- Task timestamps correlate with when work was performed
- Task descriptions contain enough context to identify client
- Super-agent is the primary tool for remote work delegation
