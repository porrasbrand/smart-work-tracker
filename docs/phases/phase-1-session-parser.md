# Phase 1: Session Parser

**Created:** 2026-01-11
**Status:** 📝 In Progress

---

## Objective

Implement a stream-based JSONL parser that reads Claude Code session logs, extracts metadata, redacts sensitive information, segments work by idle gaps, and stores session references in the database WITHOUT loading entire files into memory.

**Deliverable:** A working session parser that can process large Claude Code session files efficiently with privacy protections and date filtering.

---

## Scope

### In Scope
- Stream-based JSONL parsing (readline interface)
- Byte-offset tracking for each event
- Privacy redaction (secrets, PII, code content)
- Session metadata extraction (timestamps, cwd, git branch, files touched)
- Session segmentation by idle gaps (configurable, default 15 min)
- Date filter to skip sessions before 2026-01-09
- Save session references to `sources` table
- Save work segments to `segments` table
- File hash validation for change detection
- Error handling for malformed JSONL

### Out of Scope
- Project attribution (Phase 2)
- ActiveCollab integration (Phase 3A)
- AI-assisted analysis (Phase 3B)
- Actual time logging to AC (Phase 4)

---

## Requirements

### Functional Requirements
1. **Must** parse JSONL files line-by-line using streams (never load full file)
2. **Must** track byte offset for each line for resume capability
3. **Must** extract session metadata:
   - Session ID (from filename)
   - Start/end timestamps
   - Working directory (cwd)
   - Git branch
   - Files touched (Read/Write/Edit operations)
   - Commands executed (Bash operations)
4. **Must** redact sensitive information:
   - API keys, tokens, passwords (regex patterns)
   - PII (emails, phone numbers)
   - Code content (optional, configurable)
5. **Must** segment sessions by idle gaps (default: 15 minutes)
6. **Must** skip sessions before cutoff date (2026-01-09)
7. **Must** store session reference in `sources` table
8. **Must** store work segments in `segments` table
9. **Must** calculate file hash (SHA-256) for change detection
10. **Must** handle malformed JSONL gracefully

### Non-Functional Requirements
1. **Performance:**
   - Parse 10,000-line file in <30 seconds
   - Memory usage <100MB regardless of file size
   - Process multiple files in parallel if needed
2. **Reliability:**
   - Resume from last byte offset if interrupted
   - Handle log rotation detection
   - Graceful handling of malformed JSON lines
3. **Privacy:**
   - Never log redacted content
   - Redact secrets/PII before any storage or logging
4. **Testability:**
   - Unit tests for each parser component
   - Integration test with real session file samples

---

## Implementation Plan

### File Structure

```
/home/mp/awesome/smart-work-tracker/
├── src/
│   ├── lib/
│   │   ├── parsers/
│   │   │   ├── jsonl-parser.js        # Stream-based JSONL parser
│   │   │   ├── session-extractor.js   # Extract session metadata
│   │   │   ├── privacy-redactor.js    # Redact secrets/PII
│   │   │   └── session-segmenter.js   # Segment by idle gaps
│   │   └── session-processor.js       # Main orchestrator
│   └── cli/
│       └── commands.js                 # Add 'parse' command
└── tests/
    ├── unit/
    │   ├── jsonl-parser.test.js
    │   ├── privacy-redactor.test.js
    │   └── session-segmenter.test.js
    └── integration/
        └── session-processor.test.js
```

---

## Data Structures

### Session Metadata (In-Memory During Parse)

```javascript
{
  sessionId: "abc123-def456",          // From filename
  filePath: "/home/user/.claude/...",
  fileSize: 57234567,
  fileHash: "sha256:...",
  startTime: "2026-01-10T10:00:00Z",
  endTime: "2026-01-10T12:30:00Z",
  cwd: "/home/mp/awesome/project",
  gitBranch: "main",
  filesTouched: [
    "src/index.js",
    "tests/unit/test.js"
  ],
  commandsRun: [
    "npm test",
    "git status"
  ],
  events: [
    {
      type: "user_message",
      timestamp: "2026-01-10T10:00:00Z",
      byteOffset: 0,
      redacted: false
    },
    // ... more events
  ]
}
```

### Work Segment (Saved to Database)

```javascript
{
  sourceId: 1,                          // FK to sources table
  startTime: "2026-01-10T10:00:00Z",
  endTime: "2026-01-10T10:45:00Z",
  durationMinutes: 45,
  cwd: "/home/mp/awesome/project",
  gitBranch: "main",
  projectIdDetected: null,              // Phase 2
  projectIdFinal: null,                 // Phase 2
  confidenceScore: null,                // Phase 2
  taskDescription: null,                // Phase 3B
  workSummary: null,                    // Phase 3B
  status: "pending"
}
```

---

## Modules

### 1. src/lib/parsers/jsonl-parser.js

**Purpose:** Stream-based JSONL parser with byte-offset tracking

**Key Functions:**

```javascript
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

class JSONLParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.byteOffset = 0;
  }

  async *parseLines() {
    const fileStream = fs.createReadStream(this.filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const lineByteLength = Buffer.byteLength(line, 'utf8') + 1; // +1 for newline

      try {
        const event = JSON.parse(line);
        yield {
          event,
          byteOffset: this.byteOffset,
          lineNumber: this.lineNumber
        };
      } catch (err) {
        // Malformed JSON - yield error instead of throwing
        yield {
          error: new JSONLMalformedError(this.lineNumber, { line, byteOffset: this.byteOffset }),
          byteOffset: this.byteOffset,
          lineNumber: this.lineNumber
        };
      }

      this.byteOffset += lineByteLength;
      this.lineNumber++;
    }
  }

  async calculateFileHash() {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(this.filePath);

      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async getFileSize() {
    const stats = await fs.promises.stat(this.filePath);
    return stats.size;
  }
}

module.exports = JSONLParser;
```

---

### 2. src/lib/parsers/privacy-redactor.js

**Purpose:** Redact secrets, PII, and optionally code from events

**Patterns to Redact:**

```javascript
const REDACTION_PATTERNS = {
  // API Keys & Tokens
  apiKey: /\b[A-Za-z0-9_-]{20,}\b/g,
  awsKey: /AKIA[0-9A-Z]{16}/g,
  githubToken: /ghp_[A-Za-z0-9]{36}/g,

  // Credentials
  password: /password["']?\s*[:=]\s*["']([^"']+)["']/gi,
  token: /token["']?\s*[:=]\s*["']([^"']+)["']/gi,
  apiToken: /api[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/gi,

  // PII
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

class PrivacyRedactor {
  constructor(config) {
    this.config = config;
  }

  redactEvent(event) {
    const redacted = { ...event };

    // Redact secrets
    if (this.config.privacy.redactSecrets) {
      redacted.content = this.redactSecrets(event.content);
    }

    // Redact PII
    if (this.config.privacy.redactPII) {
      redacted.content = this.redactPII(event.content);
    }

    // Exclude code content
    if (this.config.privacy.excludeCode && this.isCodeContent(event)) {
      redacted.content = '[CODE REDACTED]';
    }

    // Extract thinking summary only
    if (this.config.privacy.extractThinkingSummary && event.type === 'thinking') {
      redacted.content = this.extractThinkingSummary(event.content);
    }

    return redacted;
  }

  redactSecrets(text) {
    if (!text || typeof text !== 'string') return text;

    let redacted = text;
    Object.entries(REDACTION_PATTERNS).forEach(([name, pattern]) => {
      if (['apiKey', 'awsKey', 'githubToken', 'password', 'token', 'apiToken'].includes(name)) {
        redacted = redacted.replace(pattern, '***REDACTED***');
      }
    });
    return redacted;
  }

  redactPII(text) {
    if (!text || typeof text !== 'string') return text;

    let redacted = text;
    Object.entries(REDACTION_PATTERNS).forEach(([name, pattern]) => {
      if (['email', 'phone', 'ssn'].includes(name)) {
        redacted = redacted.replace(pattern, '***REDACTED***');
      }
    });
    return redacted;
  }

  isCodeContent(event) {
    // Detect if event contains code (tool_use with Edit/Write)
    return event.type === 'tool_use' &&
           ['Edit', 'Write'].includes(event.tool);
  }

  extractThinkingSummary(thinkingContent) {
    // Extract first line or first 200 chars as summary
    if (!thinkingContent) return '';
    const lines = thinkingContent.split('\n');
    const firstLine = lines[0].substring(0, 200);
    return `[THINKING: ${firstLine}...]`;
  }
}

module.exports = PrivacyRedactor;
```

---

### 3. src/lib/parsers/session-extractor.js

**Purpose:** Extract session metadata from parsed events

**Key Functions:**

```javascript
class SessionExtractor {
  extractMetadata(events) {
    const metadata = {
      startTime: null,
      endTime: null,
      cwd: null,
      gitBranch: null,
      filesTouched: new Set(),
      commandsRun: new Set(),
    };

    for (const { event } of events) {
      // Extract timestamps
      if (event.timestamp) {
        const ts = new Date(event.timestamp);
        if (!metadata.startTime || ts < metadata.startTime) {
          metadata.startTime = ts;
        }
        if (!metadata.endTime || ts > metadata.endTime) {
          metadata.endTime = ts;
        }
      }

      // Extract cwd from tool_use events
      if (event.type === 'tool_use' && event.cwd) {
        metadata.cwd = metadata.cwd || event.cwd;
      }

      // Extract git branch from Bash commands
      if (event.type === 'tool_use' && event.tool === 'Bash') {
        const branchMatch = event.result?.match(/On branch ([^\s]+)/);
        if (branchMatch) {
          metadata.gitBranch = branchMatch[1];
        }
      }

      // Extract files touched (Read, Write, Edit operations)
      if (event.type === 'tool_use' && ['Read', 'Write', 'Edit'].includes(event.tool)) {
        if (event.params?.file_path) {
          metadata.filesTouched.add(event.params.file_path);
        }
      }

      // Extract commands run (Bash operations)
      if (event.type === 'tool_use' && event.tool === 'Bash') {
        if (event.params?.command) {
          metadata.commandsRun.add(event.params.command);
        }
      }
    }

    return {
      ...metadata,
      filesTouched: Array.from(metadata.filesTouched),
      commandsRun: Array.from(metadata.commandsRun),
    };
  }
}

module.exports = SessionExtractor;
```

---

### 4. src/lib/parsers/session-segmenter.js

**Purpose:** Segment session into work blocks by idle gaps

**Key Functions:**

```javascript
class SessionSegmenter {
  constructor(config) {
    this.idleGapMinutes = config.attribution.idleGapMinutes || 15;
    this.minSessionMinutes = config.attribution.minSessionMinutes || 5;
  }

  segment(events, metadata) {
    const segments = [];
    let currentSegment = null;

    for (const { event, byteOffset } of events) {
      if (!event.timestamp) continue;

      const eventTime = new Date(event.timestamp);

      // Start new segment if:
      // 1. No current segment
      // 2. Gap > idle threshold
      if (!currentSegment) {
        currentSegment = this.createSegment(eventTime, metadata);
      } else {
        const gapMinutes = (eventTime - currentSegment.endTime) / (1000 * 60);

        if (gapMinutes > this.idleGapMinutes) {
          // Save current segment if long enough
          if (this.isSegmentValid(currentSegment)) {
            segments.push(currentSegment);
          }
          // Start new segment
          currentSegment = this.createSegment(eventTime, metadata);
        } else {
          // Extend current segment
          currentSegment.endTime = eventTime;
        }
      }
    }

    // Save final segment
    if (currentSegment && this.isSegmentValid(currentSegment)) {
      segments.push(currentSegment);
    }

    return segments;
  }

  createSegment(startTime, metadata) {
    return {
      startTime,
      endTime: startTime,
      cwd: metadata.cwd,
      gitBranch: metadata.gitBranch,
      durationMinutes: 0
    };
  }

  isSegmentValid(segment) {
    const duration = (segment.endTime - segment.startTime) / (1000 * 60);
    return duration >= this.minSessionMinutes;
  }
}

module.exports = SessionSegmenter;
```

---

### 5. src/lib/session-processor.js

**Purpose:** Main orchestrator - ties all parsers together

**Key Functions:**

```javascript
const path = require('path');
const fs = require('fs').promises;
const JSONLParser = require('./parsers/jsonl-parser');
const PrivacyRedactor = require('./parsers/privacy-redactor');
const SessionExtractor = require('./parsers/session-extractor');
const SessionSegmenter = require('./parsers/session-segmenter');

class SessionProcessor {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.redactor = new PrivacyRedactor(config);
    this.extractor = new SessionExtractor();
    this.segmenter = new SessionSegmenter(config);

    // Date cutoff: 2026-01-09 00:00:00 UTC
    this.dateCutoff = new Date('2026-01-09T00:00:00Z');
  }

  async processSessionFile(filePath) {
    this.logger.info('Processing session file', { filePath });

    // Extract session ID from filename
    const sessionId = this.extractSessionId(filePath);

    // Check if already processed
    const existing = await this.db.get(
      'SELECT id, file_hash FROM sources WHERE session_id = ?',
      [sessionId]
    );

    // Calculate file hash
    const parser = new JSONLParser(filePath);
    const fileHash = await parser.calculateFileHash();
    const fileSize = await parser.getFileSize();

    // Skip if already processed with same hash
    if (existing && existing.file_hash === fileHash) {
      this.logger.info('Session already processed, skipping', { sessionId, fileHash });
      return { skipped: true, reason: 'already_processed' };
    }

    // Parse events
    const events = [];
    for await (const item of parser.parseLines()) {
      if (item.error) {
        this.logger.warn('Malformed JSONL line', {
          lineNumber: item.lineNumber,
          byteOffset: item.byteOffset
        });
        continue;
      }

      // Redact privacy-sensitive content
      const redactedEvent = this.redactor.redactEvent(item.event);

      events.push({
        event: redactedEvent,
        byteOffset: item.byteOffset,
        lineNumber: item.lineNumber
      });
    }

    if (events.length === 0) {
      this.logger.warn('No valid events in session file', { filePath });
      return { skipped: true, reason: 'no_events' };
    }

    // Extract metadata
    const metadata = this.extractor.extractMetadata(events);

    // Check date cutoff (skip old sessions for actual tracking)
    if (metadata.startTime < this.dateCutoff) {
      this.logger.info('Session before cutoff date, skipping for time tracking', {
        sessionId,
        startTime: metadata.startTime,
        cutoff: this.dateCutoff
      });
      return { skipped: true, reason: 'before_cutoff' };
    }

    // Save to sources table
    const sourceResult = await this.db.run(
      `INSERT INTO sources (session_id, file_path, file_size, file_hash, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         file_hash = excluded.file_hash,
         file_size = excluded.file_size,
         processed_at = CURRENT_TIMESTAMP`,
      [sessionId, filePath, fileSize, fileHash, 'parsed']
    );

    const sourceId = sourceResult.lastID || existing?.id;

    // Segment into work blocks
    const segments = this.segmenter.segment(events, metadata);

    this.logger.info('Session segmented', {
      sessionId,
      segmentCount: segments.length
    });

    // Save segments to database
    for (const segment of segments) {
      const durationMinutes = Math.round(
        (segment.endTime - segment.startTime) / (1000 * 60)
      );

      await this.db.run(
        `INSERT INTO segments (
          source_id, start_time, end_time, duration_minutes,
          cwd, git_branch, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sourceId,
          segment.startTime.toISOString(),
          segment.endTime.toISOString(),
          durationMinutes,
          segment.cwd,
          segment.gitBranch,
          'pending'
        ]
      );
    }

    this.logger.info('Session processed successfully', {
      sessionId,
      sourceId,
      segmentCount: segments.length
    });

    return {
      success: true,
      sessionId,
      sourceId,
      segmentCount: segments.length
    };
  }

  extractSessionId(filePath) {
    // Extract UUID from filename
    // e.g., /home/user/.claude/projects/xyz/abc-123-def.jsonl -> abc-123-def
    const basename = path.basename(filePath, '.jsonl');
    return basename;
  }

  async discoverSessionFiles(claudeProjectsDir) {
    // Discover all .jsonl files in ~/.claude/projects/
    const sessionFiles = [];

    const projectDirs = await fs.readdir(claudeProjectsDir);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(claudeProjectsDir, projectDir);
      const stat = await fs.stat(projectPath);

      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(projectPath);
      const jsonlFiles = files
        .filter(f => f.endsWith('.jsonl'))
        .map(f => path.join(projectPath, f));

      sessionFiles.push(...jsonlFiles);
    }

    return sessionFiles;
  }
}

module.exports = SessionProcessor;
```

---

## CLI Command

Add `parse` command to `src/cli/commands.js`:

```javascript
case 'parse':
  const SessionProcessor = require('../lib/session-processor');
  const processor = new SessionProcessor(db, logger, config);

  // Get Claude projects directory
  const claudeDir = flags[0] || path.join(process.env.HOME, '.claude', 'projects');

  logger.info('Discovering session files', { claudeDir });
  const sessionFiles = await processor.discoverSessionFiles(claudeDir);
  logger.info('Found session files', { count: sessionFiles.length });

  // Process each file
  let processed = 0;
  let skipped = 0;
  for (const file of sessionFiles) {
    const result = await processor.processSessionFile(file);
    if (result.skipped) {
      skipped++;
    } else if (result.success) {
      processed++;
    }
  }

  console.log(`\n✓ Processed ${processed} sessions, skipped ${skipped}`);
  break;
```

---

## Test Plan

### Unit Tests

**tests/unit/jsonl-parser.test.js:**
- [ ] Parses valid JSONL file line by line
- [ ] Tracks byte offsets correctly
- [ ] Handles malformed JSON lines gracefully
- [ ] Calculates file hash correctly
- [ ] Returns file size correctly

**tests/unit/privacy-redactor.test.js:**
- [ ] Redacts API keys (various formats)
- [ ] Redacts passwords and tokens
- [ ] Redacts emails
- [ ] Redacts phone numbers
- [ ] Excludes code content when configured
- [ ] Extracts thinking summary when configured

**tests/unit/session-segmenter.test.js:**
- [ ] Segments by idle gaps (default 15 min)
- [ ] Filters segments below minimum duration
- [ ] Creates correct number of segments
- [ ] Calculates segment durations correctly

### Integration Tests

**tests/integration/session-processor.test.js:**
- [ ] Processes complete session file end-to-end
- [ ] Saves to sources table
- [ ] Saves segments to segments table
- [ ] Skips files before cutoff date
- [ ] Skips already-processed files (same hash)
- [ ] Handles large files (>10MB) efficiently

---

## Success Criteria

✅ **Phase 1 Complete When:**
1. [ ] All parser modules implemented
2. [ ] Privacy redaction working (secrets, PII, code)
3. [ ] Session segmentation by idle gaps working
4. [ ] Date filter skips sessions before 2026-01-09
5. [ ] Saves to sources and segments tables
6. [ ] CLI `parse` command works
7. [ ] Tested with real Claude Code session file
8. [ ] Memory usage stays <100MB for large files
9. [ ] No credentials or PII in logs
10. [ ] Git committed with proper message

---

## Next Phase

**Phase 2: Project Attribution** - Deterministic rules to match sessions to ActiveCollab projects.
