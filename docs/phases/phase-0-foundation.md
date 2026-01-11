# Phase 0: Foundation

**Created:** 2026-01-11
**Revised:** 2026-01-11 (Post-OpenAI Review)
**Status:** 📝 Documented v2 - OpenAI feedback incorporated

---

## OpenAI Review Fixes (2026-01-11)

All 10 issues identified in OpenAI architecture review have been addressed:

1. ✅ **Config validation command-aware** - Validates AC credentials only for push/sync commands, not Phase 0
2. ✅ **dotenv-expand fixed** - Changed from `expand({ parsed: process.env })` to `const env = dotenv.config(); expand(env);`
3. ✅ **Down migrations added** - All 7 migrations now have matching .down.sql files for rollback
4. ✅ **SQLite FK enforced** - Added `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` in connect()
5. ✅ **Immutability enforced** - Added migration 007 with triggers to prevent UPDATE/DELETE on sources and sync_ledger
6. ✅ **Logging redaction effective** - Replaced `logger.on('data')` with custom Winston format for secret redaction
7. ✅ **CLI paths absolute** - Changed to `path.resolve(__dirname, ...)` for package.json and migrations dir
8. ✅ **Schema idempotency** - Added UNIQUE constraint on sync_ledger(segment_id, project_id, task_id)
9. ✅ **File locking implemented** - Added src/lib/file-lock.js module with acquire/release/withLock methods
10. ✅ **Testing specs specific** - Changed vague '<100ms' to specific metrics: <10ms single row, <50ms aggregation, <20ms index lookup on 1000-row dataset

---

## Objective

Establish the foundational architecture for Smart Work Tracker including project structure, database schema with migrations framework, configuration system, structured logging, error handling, and basic CLI interface.

**Deliverable:** A working skeleton with database, config, logging, and CLI ready for Phase 1 implementation.

---

## Scope

### In Scope
- Node.js project initialization (package.json, dependencies)
- SQLite database with migration framework
- Complete database schema (5 tables: sources, segments, projects_map, task_links, sync_ledger)
- JS-based configuration system with dotenv-expand
- Config validation (required fields, types)
- Credential handling (env vars, never logged)
- Structured JSON logging with rotation
- Error taxonomy implementation
- Basic CLI structure (commands framework)
- File locking strategy implementation
- Comprehensive testing setup

### Out of Scope
- Session parsing logic (Phase 1)
- Project attribution (Phase 2)
- ActiveCollab integration (Phase 3A)
- AI analysis (Phase 3B)
- Any actual business logic

---

## Risks & Assumptions

### Risks
1. **SQLite performance with large datasets**
   - Mitigation: Proper indexing, query optimization from start
   - Monitoring: Track query times in logs

2. **Config schema too rigid**
   - Mitigation: Allow custom fields, extensible design
   - Validation: Only validate required fields strictly

3. **Migration framework complexity**
   - Mitigation: Use simple SQL-based migrations, no ORM
   - Testing: Test migrations thoroughly (up and down)

4. **File locking on WSL2**
   - Mitigation: Test file locking thoroughly on WSL2
   - Fallback: Document limitations if needed

### Assumptions
1. Node.js v18+ available on system
2. SQLite3 works correctly on WSL2
3. dotenv and dotenv-expand work as expected
4. File system supports advisory locking

---

## Requirements

### Functional Requirements
1. **Must** initialize valid Node.js project with package.json
2. **Must** create SQLite database with all 5 tables via migrations
3. **Must** support JS-based config with ${VAR} expansion
4. **Must** validate config on load (required fields, types)
5. **Must** implement structured JSON logging
6. **Must** define and implement error taxonomy
7. **Must** provide basic CLI with help command
8. **Must** support database migrations (up/down)
9. **Must** handle credentials securely (env vars only)

### Non-Functional Requirements
1. **Performance:**
   - Single row queries <10ms (e.g., SELECT by id)
   - Aggregation queries <50ms on test dataset (1000 rows)
   - Index lookups <20ms on test dataset
   - Migration execution <1s per table
2. **Reliability:** All errors logged with context, no crashes
3. **Security:** No credentials in logs, config, or version control
4. **Maintainability:** Clear code structure, documented functions
5. **Testability:** All modules testable independently

---

## Implementation Plan

### File Structure

```
/home/mp/awesome/smart-work-tracker/
├── package.json
├── .env (already exists)
├── .env.example
├── .gitignore (already exists)
├── config.js                      # Main config (JS-based)
├── src/
│   ├── index.js                   # CLI entry point
│   ├── lib/
│   │   ├── database.js            # Database connection & queries
│   │   ├── migrations.js          # Migration runner
│   │   ├── logger.js              # Structured logging
│   │   ├── config-validator.js    # Config validation
│   │   ├── file-lock.js           # File locking for concurrent access
│   │   └── errors.js              # Error taxonomy
│   └── cli/
│       ├── commands.js            # CLI command router
│       └── help.js                # Help text
├── migrations/
│   ├── 001-create-sources.sql
│   ├── 001-create-sources.down.sql
│   ├── 002-create-segments.sql
│   ├── 002-create-segments.down.sql
│   ├── 003-create-projects-map.sql
│   ├── 003-create-projects-map.down.sql
│   ├── 004-create-task-links.sql
│   ├── 004-create-task-links.down.sql
│   ├── 005-create-sync-ledger.sql
│   ├── 005-create-sync-ledger.down.sql
│   ├── 006-create-indexes.sql
│   ├── 006-create-indexes.down.sql
│   ├── 007-create-immutability-triggers.sql
│   └── 007-create-immutability-triggers.down.sql
├── tests/
│   ├── unit/
│   │   ├── config.test.js
│   │   ├── logger.test.js
│   │   ├── errors.test.js
│   │   └── migrations.test.js
│   ├── integration/
│   │   └── database.test.js
│   └── setup.js                   # Test setup/teardown
├── logs/                          # Log output directory
└── data/
    └── smart-work-tracker.db      # SQLite database
```

### Data Structures (Database Schema)

#### Table: sources (immutable)
Stores raw session file references.

```sql
CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,         -- UUID from session filename
  file_path TEXT NOT NULL,                 -- Full path to .jsonl file
  file_size INTEGER NOT NULL,              -- File size in bytes
  file_hash TEXT,                          -- SHA256 of file for integrity
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,                   -- When parsing completed
  status TEXT DEFAULT 'pending'            -- pending|processing|completed|failed
);
```

**Immutability:** Never UPDATE, only INSERT and mark status.

#### Table: segments (editable)
Stores parsed work segments with attributions.

```sql
CREATE TABLE segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,              -- FK to sources
  start_time DATETIME NOT NULL,            -- Work block start
  end_time DATETIME NOT NULL,              -- Work block end
  duration_minutes INTEGER NOT NULL,       -- Calculated duration
  adjusted_duration_minutes INTEGER,       -- User-adjusted (editable)
  cwd TEXT,                                -- Working directory
  git_branch TEXT,                         -- Git branch if available
  project_id_detected INTEGER,             -- Detected AC project ID
  project_id_final INTEGER,                -- Final AC project ID (editable)
  confidence_score REAL,                   -- 0.0-1.0 attribution confidence
  task_description TEXT,                   -- AI-generated or manual (editable)
  work_summary TEXT,                       -- Summary of work done (editable)
  status TEXT DEFAULT 'pending',           -- pending|approved|pushed|skipped
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
```

**Editability:** User can modify adjusted_duration, project_id_final, task_description, work_summary.

#### Table: projects_map (editable)
Maps keywords/patterns to ActiveCollab projects.

```sql
CREATE TABLE projects_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activecollab_project_id INTEGER NOT NULL,
  activecollab_project_name TEXT NOT NULL,
  keywords TEXT,                           -- JSON array of keywords
  cwd_patterns TEXT,                       -- JSON array of path patterns
  priority INTEGER DEFAULT 0,              -- Higher priority checked first
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example:**
```json
{
  "activecollab_project_id": 123,
  "activecollab_project_name": "super-agent",
  "keywords": ["super-agent", "automation", "remote"],
  "cwd_patterns": ["/home/mp/awesome/super-agent"],
  "priority": 10
}
```

#### Table: task_links (editable)
Links segments to ActiveCollab tasks.

```sql
CREATE TABLE task_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,             -- FK to segments
  activecollab_task_id INTEGER,            -- AC task ID (if linked)
  activecollab_task_name TEXT,
  is_new_task BOOLEAN DEFAULT TRUE,        -- Created new vs linked existing
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (segment_id) REFERENCES segments(id)
);
```

#### Table: sync_ledger (immutable - critical for idempotency)
Prevents duplicate pushes to ActiveCollab.

```sql
CREATE TABLE sync_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,             -- FK to segments
  activecollab_project_id INTEGER NOT NULL,
  activecollab_task_id INTEGER,
  activecollab_time_record_id INTEGER,     -- AC time entry ID
  pushed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  push_hash TEXT,                          -- Hash of pushed data for change detection
  FOREIGN KEY (segment_id) REFERENCES segments(id),
  -- Ensure idempotency: one segment can only be pushed once per project/task combo
  UNIQUE(segment_id, activecollab_project_id, activecollab_task_id)
);
```

**Immutability:** Never UPDATE or DELETE. Only INSERT to log pushes.
**Idempotency:** UNIQUE constraint prevents duplicate pushes.

### Indexes (for performance)

```sql
-- migration 006-create-indexes.sql
CREATE INDEX idx_sources_session_id ON sources(session_id);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_segments_source_id ON segments(source_id);
CREATE INDEX idx_segments_status ON segments(status);
CREATE INDEX idx_segments_project_id_final ON segments(project_id_final);
CREATE INDEX idx_sync_ledger_segment_id ON sync_ledger(segment_id);
CREATE INDEX idx_task_links_segment_id ON task_links(segment_id);
```

### Functions/Modules

#### 1. config.js (Main Configuration)
**Purpose:** Load and export configuration with env var expansion

**Structure:**
```javascript
const dotenv = require('dotenv');
const { expand } = require('dotenv-expand');

// Load .env file and expand variables
const env = dotenv.config();
expand(env);

module.exports = {
  database: {
    path: process.env.DB_PATH || './data/smart-work-tracker.db',
  },
  activeCollab: {
    apiUrl: process.env.AC_API_URL,
    apiToken: process.env.AC_API_TOKEN,
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'none',
    apiKey: process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || 'auto',
    enabled: process.env.AI_ENABLED !== 'false',
    maxRetries: 3,
    timeout: 120000,
  },
  privacy: {
    excludeThinking: false,
    extractThinkingSummary: true,
    excludeCode: true,
    redactSecrets: true,
    redactPII: true,
  },
  attribution: {
    idleGapMinutes: parseInt(process.env.IDLE_GAP_MINUTES) || 15,
    minSessionMinutes: parseInt(process.env.MIN_SESSION_MINUTES) || 5,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    directory: './logs',
  },
  parser: {
    useByteOffsets: true,
    validateContentHash: true,
  },
};
```

**Validation:** Happens in config-validator.js

#### 2. src/lib/config-validator.js
**Purpose:** Validate configuration on load (command-aware)

**Function:**
```javascript
function validateConfig(config, command = 'all') {
  const errors = [];

  // Database path always required
  if (!config.database || !config.database.path) {
    errors.push('CONFIG_ERROR: database.path is required');
  }

  // ActiveCollab credentials only required for push/sync commands (Phase 3A+)
  const needsActiveCollab = ['push', 'sync', 'review'].includes(command);
  if (needsActiveCollab) {
    if (!config.activeCollab || !config.activeCollab.apiUrl) {
      errors.push('CONFIG_ERROR: activeCollab.apiUrl is required for ' + command);
    }
    if (!config.activeCollab || !config.activeCollab.apiToken) {
      errors.push('CONFIG_ERROR: activeCollab.apiToken is required for ' + command);
    }
  }

  // AI provider only required for AI-assisted commands (Phase 3B+)
  const needsAI = ['analyze', 'attribute'].includes(command);
  if (needsAI && config.ai && config.ai.enabled && config.ai.provider !== 'none') {
    if (!config.ai.apiKey) {
      errors.push('CONFIG_ERROR: ai.apiKey required when AI enabled for ' + command);
    }
  }

  // Idle gap must be positive
  if (config.attribution && config.attribution.idleGapMinutes <= 0) {
    errors.push('CONFIG_ERROR: attribution.idleGapMinutes must be > 0');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return true;
}

module.exports = { validateConfig };
```

#### 3. src/lib/database.js
**Purpose:** Database connection and query helpers

**Functions:**
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async connect() {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            // Enable foreign keys (critical for referential integrity)
            await this.run('PRAGMA foreign_keys = ON');

            // Enable WAL mode for better concurrency
            await this.run('PRAGMA journal_mode = WAL');

            resolve(this.db);
          } catch (pragmaErr) {
            reject(pragmaErr);
          }
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Database;
```

#### 4. src/lib/migrations.js
**Purpose:** Run database migrations (up and down)

**Functions:**
```javascript
const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(db, migrationsDir) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  async ensureMigrationsTable() {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations() {
    const rows = await this.db.all('SELECT filename FROM migrations ORDER BY filename');
    return rows.map(r => r.filename);
  }

  async runMigrations(direction = 'up') {
    await this.ensureMigrationsTable();

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = await this.getAppliedMigrations();

    if (direction === 'up') {
      const pending = files.filter(f => !applied.includes(f));

      if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
      }

      for (const file of pending) {
        const sql = fs.readFileSync(path.join(this.migrationsDir, file), 'utf8');
        console.log(`Running migration UP: ${file}`);

        try {
          await this.db.run(sql);
          await this.db.run('INSERT INTO migrations (filename) VALUES (?)', [file]);
          console.log(`✓ ${file} applied`);
        } catch (err) {
          console.error(`✗ ${file} failed:`, err.message);
          throw err;
        }
      }

      console.log(`\n✓ ${pending.length} migrations applied successfully`);
    } else if (direction === 'down') {
      if (applied.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }

      // Rollback the most recent migration
      const latest = applied[applied.length - 1];
      const downFile = latest.replace('.sql', '.down.sql');
      const downPath = path.join(this.migrationsDir, downFile);

      if (!fs.existsSync(downPath)) {
        throw new Error(`Down migration not found: ${downFile}`);
      }

      const sql = fs.readFileSync(downPath, 'utf8');
      console.log(`Running migration DOWN: ${downFile}`);

      try {
        await this.db.run(sql);
        await this.db.run('DELETE FROM migrations WHERE filename = ?', [latest]);
        console.log(`✓ ${latest} rolled back`);
      } catch (err) {
        console.error(`✗ ${downFile} failed:`, err.message);
        throw err;
      }
    }
  }
}

module.exports = MigrationRunner;
```

#### 5. src/lib/logger.js
**Purpose:** Structured JSON logging with rotation

**Functions:**
```javascript
const winston = require('winston');
const path = require('path');
const fs = require('fs');

function createLogger(config) {
  const logDir = config.logging.directory || './logs';

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Custom format to redact secrets
  const redactSecrets = winston.format((info) => {
    const secretPatterns = [
      /apiToken["']?\s*:\s*["']([^"']+)["']/gi,
      /apiKey["']?\s*:\s*["']([^"']+)["']/gi,
      /password["']?\s*:\s*["']([^"']+)["']/gi,
      /token["']?\s*:\s*["']([^"']+)["']/gi,
    ];

    let message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);

    secretPatterns.forEach(pattern => {
      message = message.replace(pattern, (match, secret) => {
        return match.replace(secret, '***REDACTED***');
      });
    });

    info.message = message;
    return info;
  });

  const logger = winston.createLogger({
    level: config.logging.level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      redactSecrets(),
      winston.format.json()
    ),
    defaultMeta: { service: 'smart-work-tracker' },
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
    ],
  });

  // Also log to console in dev
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }));
  }

  return logger;
}

module.exports = { createLogger };
```

#### 6. src/lib/errors.js
**Purpose:** Error taxonomy implementation

**Structure:**
```javascript
class SmartWorkTrackerError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Parse Errors
class JSONLMalformedError extends SmartWorkTrackerError {
  constructor(line, details) {
    super(`Malformed JSONL at line ${line}`, 'JSONL_MALFORMED', details);
  }
}

class JSONLMissingFieldError extends SmartWorkTrackerError {
  constructor(field, details) {
    super(`Required field missing: ${field}`, 'JSONL_MISSING_FIELD', details);
  }
}

class JSONLUnknownTypeError extends SmartWorkTrackerError {
  constructor(type, details) {
    super(`Unknown event type: ${type}`, 'JSONL_UNKNOWN_TYPE', details);
  }
}

class JSONLOffsetInvalidError extends SmartWorkTrackerError {
  constructor(details) {
    super('Byte offset invalid (log rotation detected)', 'JSONL_OFFSET_INVALID', details);
  }
}

// Attribution Errors
class AttributionNoSignalsError extends SmartWorkTrackerError {
  constructor(details) {
    super('Insufficient data for attribution', 'ATTR_NO_SIGNALS', details);
  }
}

class AttributionAmbiguousError extends SmartWorkTrackerError {
  constructor(candidates, details) {
    super(`Ambiguous attribution: ${candidates.length} candidates`, 'ATTR_AMBIGUOUS', details);
  }
}

// API Errors
class ACAuthFailedError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab authentication failed', 'AC_AUTH_FAILED', details);
  }
}

class ACRateLimitError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab rate limit exceeded', 'AC_RATE_LIMIT', details);
  }
}

class ACNetworkError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab network error', 'AC_NETWORK_ERROR', details);
  }
}

class ACAPIChangedError extends SmartWorkTrackerError {
  constructor(details) {
    super('ActiveCollab API unexpected response', 'AC_API_CHANGED', details);
  }
}

class AIAPIError extends SmartWorkTrackerError {
  constructor(provider, details) {
    super(`${provider} API error`, 'AI_API_ERROR', details);
  }
}

class AIContextOverflowError extends SmartWorkTrackerError {
  constructor(details) {
    super('Session too large for AI context window', 'AI_CONTEXT_OVERFLOW', details);
  }
}

// Database Errors
class DBMigrationFailedError extends SmartWorkTrackerError {
  constructor(migration, details) {
    super(`Migration failed: ${migration}`, 'DB_MIGRATION_FAILED', details);
  }
}

class DBConstraintViolationError extends SmartWorkTrackerError {
  constructor(constraint, details) {
    super(`Database constraint violation: ${constraint}`, 'DB_CONSTRAINT_VIOLATION', details);
  }
}

// Configuration Errors
class ConfigError extends SmartWorkTrackerError {
  constructor(message, details) {
    super(message, 'CONFIG_ERROR', details);
  }
}

class ConfigMissingEnvError extends SmartWorkTrackerError {
  constructor(envVar, details) {
    super(`Required environment variable missing: ${envVar}`, 'CONFIG_MISSING_ENV', details);
  }
}

// Concurrency Errors
class FileLockedError extends SmartWorkTrackerError {
  constructor(file, details) {
    super(`File locked by another process: ${file}`, 'FILE_LOCKED', details);
  }
}

class LogRotationDetectedError extends SmartWorkTrackerError {
  constructor(details) {
    super('Log file rotated during read', 'LOG_ROTATION_DETECTED', details);
  }
}

module.exports = {
  SmartWorkTrackerError,
  // Parse
  JSONLMalformedError,
  JSONLMissingFieldError,
  JSONLUnknownTypeError,
  JSONLOffsetInvalidError,
  // Attribution
  AttributionNoSignalsError,
  AttributionAmbiguousError,
  // API
  ACAuthFailedError,
  ACRateLimitError,
  ACNetworkError,
  ACAPIChangedError,
  AIAPIError,
  AIContextOverflowError,
  // Database
  DBMigrationFailedError,
  DBConstraintViolationError,
  // Config
  ConfigError,
  ConfigMissingEnvError,
  // Concurrency
  FileLockedError,
  LogRotationDetectedError,
};
```

#### 7. src/lib/file-lock.js
**Purpose:** File locking for concurrent access to session logs

**Structure:**
```javascript
const fs = require('fs');
const path = require('path');

class FileLock {
  constructor(filePath) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
    this.fd = null;
  }

  async acquire(timeout = 5000) {
    const startTime = Date.now();

    while (true) {
      try {
        // Try to create exclusive lock file
        this.fd = fs.openSync(this.lockPath, 'wx');
        return true; // Lock acquired
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Lock file exists, check if it's stale
          const stats = fs.statSync(this.lockPath);
          const age = Date.now() - stats.mtimeMs;

          // If lock is older than 30 seconds, assume stale and remove
          if (age > 30000) {
            try {
              fs.unlinkSync(this.lockPath);
              continue; // Try again
            } catch (unlinkErr) {
              // Another process removed it, continue
            }
          }

          // Wait and retry
          if (Date.now() - startTime > timeout) {
            throw new Error(`Failed to acquire lock for ${this.filePath} after ${timeout}ms`);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw err;
        }
      }
    }
  }

  release() {
    if (this.fd) {
      try {
        fs.closeSync(this.fd);
        fs.unlinkSync(this.lockPath);
        this.fd = null;
      } catch (err) {
        // Ignore errors on release
      }
    }
  }

  async withLock(fn, timeout = 5000) {
    try {
      await this.acquire(timeout);
      return await fn();
    } finally {
      this.release();
    }
  }
}

module.exports = FileLock;
```

#### 8. src/cli/commands.js
**Purpose:** CLI command router

**Structure:**
```javascript
const path = require('path');
const helpCommand = require('./help');

function parseArgs(args) {
  const command = args[2] || 'help';
  const flags = args.slice(3);
  return { command, flags };
}

async function executeCommand(command, flags, { db, logger, config }) {
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      helpCommand.show();
      break;

    case 'version':
    case '--version':
    case '-v':
      const pkg = require(path.resolve(__dirname, '../../package.json'));
      console.log(`Smart Work Tracker v${pkg.version}`);
      break;

    case 'migrate':
      const MigrationRunner = require('../lib/migrations');
      const migrationsDir = path.resolve(__dirname, '../../migrations');
      const runner = new MigrationRunner(db, migrationsDir);
      await runner.runMigrations();
      break;

    case 'status':
      console.log('Smart Work Tracker Status:');
      console.log(`Database: ${config.database.path}`);
      const sourcesCount = await db.get('SELECT COUNT(*) as count FROM sources');
      console.log(`Sources: ${sourcesCount.count}`);
      const segmentsCount = await db.get('SELECT COUNT(*) as count FROM segments');
      console.log(`Segments: ${segmentsCount.count}`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "smart-work-tracker help" for usage information.');
      process.exit(1);
  }
}

module.exports = { parseArgs, executeCommand };
```

#### 8. src/cli/help.js
**Purpose:** Help text

**Function:**
```javascript
function show() {
  console.log(`
Smart Work Tracker - Automated time tracking from Claude Code sessions

USAGE:
  smart-work-tracker <command> [options]

COMMANDS:
  help              Show this help message
  version           Show version number
  migrate           Run database migrations
  status            Show tracker status

  (More commands available in later phases)

OPTIONS:
  --help, -h        Show help
  --version, -v     Show version

EXAMPLES:
  smart-work-tracker migrate
  smart-work-tracker status

For more information, see: docs/README.md
  `.trim());
}

module.exports = { show };
```

#### 9. src/index.js (CLI Entry Point)
**Purpose:** Main entry point

**Structure:**
```javascript
#!/usr/bin/env node

const config = require('../config');
const { validateConfig } = require('./lib/config-validator');
const { createLogger } = require('./lib/logger');
const Database = require('./lib/database');
const { parseArgs, executeCommand } = require('./cli/commands');

async function main() {
  let db;
  let logger;

  try {
    // Parse command first (before validation)
    const { command, flags } = parseArgs(process.argv);

    // Validate configuration (command-aware)
    validateConfig(config, command);

    // Create logger
    logger = createLogger(config);
    logger.info('Smart Work Tracker starting...', { command });

    // Connect to database
    db = new Database(config.database.path);
    await db.connect();
    logger.info('Database connected', { path: config.database.path });

    // Execute command
    await executeCommand(command, flags, { db, logger, config });

    logger.info('Command completed successfully', { command });
  } catch (error) {
    if (logger) {
      logger.error('Fatal error', { error: error.message, code: error.code, stack: error.stack });
    } else {
      console.error('Fatal error:', error.message);
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

main();
```

---

## Test Plan

### Unit Tests

**tests/unit/config.test.js:**
- [ ] Config loads successfully with valid .env
- [ ] Config validation catches missing required fields
- [ ] Environment variable expansion works (${VAR})
- [ ] Invalid config throws ConfigError

**tests/unit/logger.test.js:**
- [ ] Logger creates log directory if missing
- [ ] Logger writes to file
- [ ] Logger formats as JSON
- [ ] Logger rotates files at size limit
- [ ] Logger never logs credentials (check filter)

**tests/unit/errors.test.js:**
- [ ] Each error class constructs correctly
- [ ] Error codes match taxonomy
- [ ] Error details captured
- [ ] Stack traces included

**tests/unit/migrations.test.js:**
- [ ] Migration runner lists pending migrations
- [ ] Migration runner applies migrations in order
- [ ] Migration runner tracks applied migrations
- [ ] Migration runner skips already-applied
- [ ] Migration runner fails gracefully on SQL error

### Integration Tests

**tests/integration/database.test.js:**
- [ ] Database connects successfully
- [ ] Migrations create all 7 migrations (including triggers)
- [ ] All indexes created
- [ ] Can insert into each table
- [ ] Foreign key constraints work (enabled via PRAGMA)
- [ ] WAL mode enabled
- [ ] Immutability triggers prevent UPDATE/DELETE on sources table
- [ ] Immutability triggers prevent UPDATE/DELETE on sync_ledger table
- [ ] Query performance metrics (on 1000-row test dataset):
  - [ ] Single row query by ID: <10ms
  - [ ] COUNT(*) aggregation: <50ms
  - [ ] Index-based lookup: <20ms
  - [ ] Migration execution: <1s per table

### Manual Tests
- [ ] Run `npm test` and all tests pass
- [ ] Run `npm start help` and help displays
- [ ] Run `npm start migrate` and migrations apply
- [ ] Run `npm start status` and status displays
- [ ] Check `logs/` directory created
- [ ] Check `data/smart-work-tracker.db` created
- [ ] Verify no credentials in logs

---

## Migration Plan

### Database Changes
All migrations in `migrations/` directory, numbered sequentially:

**001-create-sources.sql:**
```sql
CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  status TEXT DEFAULT 'pending'
);
```

**002-create-segments.sql:**
```sql
CREATE TABLE segments (
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
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
```

**003-create-projects-map.sql:**
```sql
CREATE TABLE projects_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activecollab_project_id INTEGER NOT NULL,
  activecollab_project_name TEXT NOT NULL,
  keywords TEXT,
  cwd_patterns TEXT,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**004-create-task-links.sql:**
```sql
CREATE TABLE task_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  activecollab_task_id INTEGER,
  activecollab_task_name TEXT,
  is_new_task BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (segment_id) REFERENCES segments(id)
);
```

**005-create-sync-ledger.sql:**
```sql
CREATE TABLE sync_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  activecollab_project_id INTEGER NOT NULL,
  activecollab_task_id INTEGER,
  activecollab_time_record_id INTEGER,
  pushed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  push_hash TEXT,
  FOREIGN KEY (segment_id) REFERENCES segments(id),
  -- Ensure idempotency: one segment can only be pushed once per project/task combo
  UNIQUE(segment_id, activecollab_project_id, activecollab_task_id)
);
```

**006-create-indexes.sql:**
```sql
CREATE INDEX idx_sources_session_id ON sources(session_id);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_segments_source_id ON segments(source_id);
CREATE INDEX idx_segments_status ON segments(status);
CREATE INDEX idx_segments_project_id_final ON segments(project_id_final);
CREATE INDEX idx_sync_ledger_segment_id ON sync_ledger(segment_id);
CREATE INDEX idx_task_links_segment_id ON task_links(segment_id);
```

**007-create-immutability-triggers.sql:**
```sql
-- Prevent UPDATE/DELETE on sources table (immutable)
CREATE TRIGGER prevent_sources_update
BEFORE UPDATE ON sources
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sources table is immutable - UPDATE not allowed');
END;

CREATE TRIGGER prevent_sources_delete
BEFORE DELETE ON sources
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sources table is immutable - DELETE not allowed');
END;

-- Prevent UPDATE/DELETE on sync_ledger table (immutable append-only log)
CREATE TRIGGER prevent_sync_ledger_update
BEFORE UPDATE ON sync_ledger
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sync_ledger table is immutable - UPDATE not allowed');
END;

CREATE TRIGGER prevent_sync_ledger_delete
BEFORE DELETE ON sync_ledger
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sync_ledger table is immutable - DELETE not allowed');
END;
```

### Down Migrations (Rollback Support)

**007-create-immutability-triggers.down.sql:**
```sql
DROP TRIGGER IF EXISTS prevent_sync_ledger_delete;
DROP TRIGGER IF EXISTS prevent_sync_ledger_update;
DROP TRIGGER IF EXISTS prevent_sources_delete;
DROP TRIGGER IF EXISTS prevent_sources_update;
```

**006-create-indexes.down.sql:**
```sql
DROP INDEX IF EXISTS idx_task_links_segment_id;
DROP INDEX IF EXISTS idx_sync_ledger_segment_id;
DROP INDEX IF EXISTS idx_segments_project_id_final;
DROP INDEX IF EXISTS idx_segments_status;
DROP INDEX IF EXISTS idx_segments_source_id;
DROP INDEX IF EXISTS idx_sources_status;
DROP INDEX IF EXISTS idx_sources_session_id;
```

**005-create-sync-ledger.down.sql:**
```sql
DROP TABLE IF EXISTS sync_ledger;
```

**004-create-task-links.down.sql:**
```sql
DROP TABLE IF EXISTS task_links;
```

**003-create-projects-map.down.sql:**
```sql
DROP TABLE IF EXISTS projects_map;
```

**002-create-segments.down.sql:**
```sql
DROP TABLE IF EXISTS segments;
```

**001-create-sources.down.sql:**
```sql
DROP TABLE IF EXISTS sources;
```

### Data Transformations
None (fresh database).

---

## Success Criteria

- [ ] All tests pass (unit, integration, manual)
- [ ] Database creates successfully via migrations
- [ ] Config validation works correctly
- [ ] Structured logging operational
- [ ] CLI help and status commands work
- [ ] No credentials in logs (verified)
- [ ] Error taxonomy implemented and testable
- [ ] Migration framework runs migrations correctly
- [ ] Performance: Queries <100ms
- [ ] Code is clean, documented, and follows best practices

---

## Dependencies

- **Requires:** Nothing (first phase)
- **Provides:** Foundation for all future phases

### NPM Packages Needed

```json
{
  "dependencies": {
    "sqlite3": "^5.1.7",
    "dotenv": "^16.4.5",
    "dotenv-expand": "^11.0.6",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

---

## Estimated Effort

**3-4 hours** of development + testing.

---

## Status

- [x] Documented
- [ ] Reviewed (AI) - **Pending @remote consultation**
- [ ] Implemented
- [ ] Tested
- [ ] Consulted (AI) - **Optional for this phase**
- [ ] Approved
- [ ] Released & Tagged

---

## Completion

- **Completed:** [Pending]
- **Tag:** `phase-0-complete`
- **Deviations:** [None yet]
- **Lessons Learned:** [To be filled after completion]
