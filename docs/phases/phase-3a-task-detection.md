# Phase 3A: New vs Existing Task Detection (AI-Free)

**Created:** 2026-01-11
**Status:** 📝 In Progress

---

## Objective

Implement heuristic-based detection to determine whether a work segment represents:
1. **New task** - Creating something from scratch
2. **Existing task** - Working on/updating an existing feature
3. **Bug fix** - Fixing errors or issues
4. **Refactoring** - Improving existing code without adding features
5. **Unknown** - Cannot determine (will be reviewed in Phase 5)

**Deliverable:** A working task detection system that can classify 70%+ of work segments without using AI.

---

## Scope

### In Scope
- Heuristic analysis of file operations (Read/Write/Edit)
- Command pattern analysis (git, test, build commands)
- Git branch name analysis (feature/, bugfix/, etc.)
- Task description generation from file paths and commands
- Confidence scoring for task type detection
- CLI command to run task detection

### Out of Scope
- AI-assisted task description generation (Phase 3B)
- ActiveCollab task creation/updates (Phase 4)
- Manual review interface (Phase 5)

---

## Requirements

### Functional Requirements
1. **Must** analyze file operations to detect task type
2. **Must** analyze bash commands for task indicators
3. **Must** analyze git branch names for type hints
4. **Must** generate basic task descriptions from context
5. **Must** calculate confidence score (0.0 - 1.0)
6. **Must** update `task_description` in segments
7. **Must** handle indeterminate cases gracefully

### Non-Functional Requirements
1. **Performance:** Process 100 segments in <3 seconds
2. **Accuracy:** >70% correct classification on test dataset
3. **Maintainability:** Easy to add new detection rules

---

## Detection Rules

### Rule 1: File Operations Analysis

**New Task Indicators:**
- Creating multiple new files (Write > 3 files)
- New directory structures
- Initial scaffold/boilerplate generation
- Branch name contains: `feature/`, `add-`, `new-`, `create-`

**Existing Task Indicators:**
- Mostly Edit operations (Edit > Write)
- Reading many existing files
- Modifying configuration files
- Branch name contains: `update-`, `improve-`, `enhance-`

**Bug Fix Indicators:**
- Branch name contains: `fix-`, `bugfix/`, `hotfix/`
- Commands include: `test`, `debug`, `error`
- File names include: `test.`, `.spec.`, `.test.`

**Refactoring Indicators:**
- Branch name contains: `refactor-`, `cleanup-`
- High Edit:Write ratio (>80% edits)
- Commands include: `lint`, `format`

### Rule 2: Command Analysis

**Patterns to detect:**
- `npm install <pkg>` → Installing new dependency (new task)
- `git init` / `mkdir <project>` → Starting new project (new task)
- `npm test` / `pytest` → Testing/debugging (bug fix or existing)
- `npm run build` → Building/deploying (existing task)
- `git commit --amend` → Fixing recent work (bug fix)

### Rule 3: Branch Name Analysis

**Pattern matching:**
```
feature/* → new task
add-* → new task
new-* → new task
create-* → new task

update-* → existing task
improve-* → existing task
enhance-* → existing task

fix-* → bug fix
bugfix/* → bug fix
hotfix/* → bug fix

refactor-* → refactoring
cleanup-* → refactoring
```

### Rule 4: Task Description Generation

**Simple templates based on context:**

For new tasks:
```
"Add {feature name} to {project}"
"Create {component name} component"
"Implement {functionality}"
```

For existing tasks:
```
"Update {feature name}"
"Improve {component name}"
"Enhance {functionality}"
```

For bug fixes:
```
"Fix {issue description}"
"Debug {component name}"
"Resolve {error type}"
```

**Extract context from:**
- File paths (e.g., `src/components/UserAuth.js` → "UserAuth component")
- Commands (e.g., `npm install axios` → "Add axios dependency")
- Git branch name (e.g., `feature/add-dark-mode` → "dark mode")

---

## Confidence Scoring

**Confidence levels:**
- **1.0** - Very clear indicators (branch name + file ops + commands align)
- **0.8** - Clear indicators (2 of 3 signals align)
- **0.6** - Moderate indicators (1 strong signal)
- **0.4** - Weak indicators (conflicting signals)
- **0.2** - Very weak (no clear indicators)
- **0.0** - Cannot determine

**Threshold for auto-classification:** 0.6+
**Below threshold:** Mark for manual review (Phase 5)

---

## Implementation Plan

### Step 1: Create Task Detector Module

**File:** `src/lib/task-detector.js`

**Responsibilities:**
- Analyze file operations from segment metadata
- Parse bash commands for task indicators
- Extract task type from git branch name
- Generate basic task description
- Calculate confidence score

**Key methods:**
```javascript
class TaskDetector {
  detectTaskType(segment, metadata) {
    // Returns: { type, description, confidence }
  }

  analyzeFileOperations(filesTouched) {
    // Returns task type hints from file ops
  }

  analyzeCommands(commandsRun) {
    // Returns task type hints from commands
  }

  analyzeBranchName(gitBranch) {
    // Returns task type from branch naming convention
  }

  generateDescription(segment, metadata, taskType) {
    // Generate basic task description
  }

  calculateConfidence(signals) {
    // Calculate overall confidence from signals
  }
}
```

### Step 2: Enhance Session Metadata Storage

Currently segments store only:
- cwd, git_branch, duration

We need to also track:
- Files touched (from Read/Write/Edit operations)
- Commands run (from Bash operations)

**Solution:** Add JSON fields to segments table:
```sql
ALTER TABLE segments ADD COLUMN files_touched TEXT;
ALTER TABLE segments ADD COLUMN commands_run TEXT;
```

### Step 3: Update Session Processor

Modify `session-processor.js` to:
1. Pass full file/command metadata to segmenter
2. Store files_touched and commands_run in segments table

### Step 4: Add CLI Command

**Command:** `npm start detect`

**Functionality:**
- Load all pending segments without task descriptions
- Run task detection on each segment
- Update task_description and confidence_score
- Report results (classified vs unknown)

### Step 5: Test with Real Data

**Test cases:**
- Segments from known new feature work
- Segments from bug fixes
- Segments from refactoring sessions
- Segments with mixed work

---

## Data Structures

### Enhanced Segment Metadata

```javascript
{
  // Existing fields:
  cwd: "/home/mp/awesome/super-agent",
  gitBranch: "feature/add-dark-mode",
  durationMinutes: 45,

  // New fields:
  filesTouched: [
    "/home/mp/awesome/super-agent/src/components/ThemeToggle.js",
    "/home/mp/awesome/super-agent/src/styles/dark.css",
    "/home/mp/awesome/super-agent/package.json"
  ],
  commandsRun: [
    "npm install react-theme-provider",
    "git add src/components/ThemeToggle.js",
    "npm test"
  ]
}
```

### Task Detection Result

```javascript
{
  type: "new_task",  // new_task | existing_task | bug_fix | refactoring | unknown
  description: "Add dark mode theme toggle to super-agent",
  confidence: 0.85,
  signals: {
    branchName: { type: "new_task", confidence: 1.0 },
    fileOps: { type: "new_task", confidence: 0.8 },
    commands: { type: "new_task", confidence: 0.7 }
  }
}
```

---

## Migration: 009-add-task-metadata

**Up:**
```sql
-- Add task metadata fields to segments table
ALTER TABLE segments ADD COLUMN files_touched TEXT;
ALTER TABLE segments ADD COLUMN commands_run TEXT;
```

**Down:**
```sql
-- SQLite doesn't support DROP COLUMN, so we'd need to recreate table
-- For now, just leave the columns (they won't hurt)
```

---

## Success Criteria

✅ **Phase 3A Complete when:**
1. Task detector module implemented and tested
2. Migration 009 applied successfully
3. Session processor updated to store file/command metadata
4. CLI `detect` command working
5. Successfully classified 70%+ of test segments
6. Task descriptions generated for classified segments
7. Confidence scores calculated accurately
8. Unknown cases properly flagged for manual review

---

## Testing Strategy

### Unit Tests
- Test branch name parser with various patterns
- Test file operation analyzer
- Test command analyzer
- Test confidence calculator

### Integration Tests
- Parse real Claude Code sessions
- Run task detection on parsed segments
- Verify task types match expected results
- Verify confidence scores are reasonable

### Manual Validation
- Review 20 randomly selected segments
- Compare detected task type vs actual work done
- Measure accuracy percentage
- Identify failure patterns for improvement

---

## Next Steps After Phase 3A

**Phase 3B: AI-Assisted Attribution (Optional)**
- Use Gemini API to improve task descriptions
- Generate more detailed work summaries
- Improve accuracy for ambiguous cases

**Phase 4: ActiveCollab Integration (Write Operations)**
- Create new tasks in ActiveCollab
- Update existing task time entries
- Handle task status updates

---

## Notes

**Design Decisions:**
- Starting with rules-based approach (AI-free) to establish baseline
- Storing files_touched and commands_run as JSON for flexibility
- Using confidence threshold to determine auto-classify vs manual review
- Keeping descriptions simple for now (Phase 3B will enhance)

**Risks:**
- Rule-based approach may not handle edge cases well (mitigated by confidence scoring)
- JSON fields may get large for long sessions (acceptable for v1)
- Branch naming conventions may vary (can customize rules)

**Assumptions:**
- Users follow reasonable branch naming conventions
- File paths contain meaningful names
- Commands contain useful context
