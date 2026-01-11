# Phase 2: Project Attribution

**Created:** 2026-01-11
**Status:** 📝 In Progress

---

## Objective

Implement deterministic rules-based project attribution to match work segments to ActiveCollab projects using CWD patterns, keywords, and manual priority rules WITHOUT using AI.

**Deliverable:** A working attribution engine that can automatically match 80%+ of work segments to the correct ActiveCollab project using simple rules.

---

## Scope

### In Scope
- Load ActiveCollab projects into projects_map table
- CWD pattern matching (e.g., `/home/mp/awesome/super-agent` → "Intelemark" project)
- Keyword matching in file paths and commands
- Priority-based selection when multiple matches
- Confidence scoring for attributions
- CLI command to run attribution
- Update segments with detected project IDs

### Out of Scope
- AI-assisted attribution (Phase 3B)
- ActiveCollab write operations (Phase 4)
- Manual review interface (Phase 5)

---

## Requirements

### Functional Requirements
1. **Must** load all ActiveCollab projects into `projects_map` table
2. **Must** match segments to projects by CWD pattern
3. **Must** match segments by keywords in file paths
4. **Must** support manual priority rules (higher priority = preferred match)
5. **Must** calculate confidence score (0.0 - 1.0)
6. **Must** update `project_id_detected` and `confidence_score` in segments
7. **Must** handle ambiguous matches (multiple projects match)
8. **Must** handle no matches gracefully

### Non-Functional Requirements
1. **Performance:** Attribute 100 segments in <5 seconds
2. **Accuracy:** >80% correct attribution on test dataset
3. **Maintainability:** Easy to add new projects and rules

---

## Attribution Rules

### Rule 1: Exact CWD Match (Confidence: 1.0)
If segment.cwd exactly matches a project's cwd_pattern:
```javascript
// Example:
// Segment cwd: "/home/mp/awesome/super-agent"
// Project pattern: "/home/mp/awesome/super-agent"
// Result: MATCH (confidence = 1.0)
```

### Rule 2: CWD Substring Match (Confidence: 0.9)
If segment.cwd contains a project's cwd_pattern:
```javascript
// Example:
// Segment cwd: "/home/mp/awesome/super-agent/services"
// Project pattern: "/home/mp/awesome/super-agent"
// Result: MATCH (confidence = 0.9)
```

### Rule 3: Keyword Match (Confidence: 0.7 per keyword)
If segment's files or commands contain project keywords:
```javascript
// Example:
// Project keywords: ["intelemark", "super-agent"]
// Files touched: ["super-agent/services/send-service.js"]
// Result: MATCH (confidence = 0.7)
```

### Rule 4: Multiple Keywords (Confidence: min(1.0, 0.7 * keyword_count))
More keywords = higher confidence:
```javascript
// 1 keyword = 0.7
// 2 keywords = 1.0 (capped)
// 3+ keywords = 1.0
```

### Rule 5: Priority Tie-Breaker
When multiple projects match with same confidence, use priority:
```javascript
// Project A: confidence = 0.9, priority = 10
// Project B: confidence = 0.9, priority = 5
// Result: Select Project A (higher priority)
```

---

## Implementation Plan

### File Structure

```
/home/mp/awesome/smart-work-tracker/
├── src/
│   ├── lib/
│   │   ├── attributor.js              # Main attribution engine
│   │   └── activecollab-sync.js       # Load AC projects (read-only)
│   └── cli/
│       └── commands.js                 # Add 'attribute' and 'sync-projects' commands
```

---

## Modules

### 1. src/lib/activecollab-sync.js

**Purpose:** Read-only ActiveCollab integration to load projects

**Key Functions:**

```javascript
const axios = require('axios');

class ActiveCollabSync {
  constructor(config, db, logger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.apiUrl = config.activeCollab.apiUrl;
    this.apiToken = config.activeCollab.apiToken;
  }

  async syncProjects() {
    this.logger.info('Syncing ActiveCollab projects');

    // Fetch projects from ActiveCollab API
    const response = await axios.get(`${this.apiUrl}/api/v1/projects`, {
      headers: {
        'X-Angie-AuthApiToken': this.apiToken
      }
    });

    const projects = response.data;
    this.logger.info('Fetched projects from ActiveCollab', { count: projects.length });

    // Save to projects_map table
    for (const project of projects) {
      // Generate basic CWD patterns from project name
      const cwdPatterns = this.generateCwdPatterns(project.name);
      const keywords = this.generateKeywords(project.name);

      await this.db.run(
        `INSERT INTO projects_map (
          activecollab_project_id,
          activecollab_project_name,
          keywords,
          cwd_patterns,
          priority
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(activecollab_project_id) DO UPDATE SET
          activecollab_project_name = excluded.activecollab_project_name,
          updated_at = CURRENT_TIMESTAMP`,
        [
          project.id,
          project.name,
          JSON.stringify(keywords),
          JSON.stringify(cwdPatterns),
          0 // Default priority
        ]
      );
    }

    this.logger.info('Projects synced successfully', { count: projects.length });
    return projects.length;
  }

  generateCwdPatterns(projectName) {
    // Generate likely CWD patterns from project name
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return [
      `/home/mp/awesome/${slug}`,
      `/${slug}`,
    ];
  }

  generateKeywords(projectName) {
    // Extract keywords from project name
    return projectName.toLowerCase().split(/[^a-z0-9]+/).filter(k => k.length > 2);
  }
}

module.exports = ActiveCollabSync;
```

---

### 2. src/lib/attributor.js

**Purpose:** Rule-based project attribution engine

**Key Functions:**

```javascript
class Attributor {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
  }

  async attributeSegments() {
    this.logger.info('Starting project attribution');

    // Get all pending segments
    const segments = await this.db.all(
      'SELECT * FROM segments WHERE status = ? AND project_id_detected IS NULL',
      ['pending']
    );

    this.logger.info('Found segments to attribute', { count: segments.length });

    // Get all projects
    const projects = await this.db.all('SELECT * FROM projects_map');

    // Parse JSON fields
    projects.forEach(p => {
      p.keywords = p.keywords ? JSON.parse(p.keywords) : [];
      p.cwd_patterns = p.cwd_patterns ? JSON.parse(p.cwd_patterns) : [];
    });

    let attributed = 0;
    let ambiguous = 0;
    let noMatch = 0;

    for (const segment of segments) {
      const matches = this.findMatches(segment, projects);

      if (matches.length === 0) {
        this.logger.debug('No project match', { segmentId: segment.id, cwd: segment.cwd });
        noMatch++;
      } else if (matches.length === 1) {
        // Single match - attribute it
        await this.attributeSegment(segment, matches[0]);
        attributed++;
      } else {
        // Multiple matches - use priority to select best
        const best = this.selectBestMatch(matches);
        await this.attributeSegment(segment, best);
        attributed++;
        if (best.confidence < 1.0) {
          ambiguous++;
        }
      }
    }

    this.logger.info('Attribution complete', {
      attributed,
      ambiguous,
      noMatch
    });

    return { attributed, ambiguous, noMatch };
  }

  findMatches(segment, projects) {
    const matches = [];

    for (const project of projects) {
      const confidence = this.calculateConfidence(segment, project);

      if (confidence > 0) {
        matches.push({
          project,
          confidence
        });
      }
    }

    return matches;
  }

  calculateConfidence(segment, project) {
    let confidence = 0;

    // Rule 1: Exact CWD match
    if (segment.cwd && project.cwd_patterns) {
      for (const pattern of project.cwd_patterns) {
        if (segment.cwd === pattern) {
          return 1.0; // Exact match - highest confidence
        }
      }
    }

    // Rule 2: CWD substring match
    if (segment.cwd && project.cwd_patterns) {
      for (const pattern of project.cwd_patterns) {
        if (segment.cwd.includes(pattern) || pattern.includes(segment.cwd)) {
          confidence = Math.max(confidence, 0.9);
        }
      }
    }

    // Rule 3 & 4: Keyword matching
    if (segment.cwd && project.keywords) {
      const cwdLower = segment.cwd.toLowerCase();
      let keywordMatches = 0;

      for (const keyword of project.keywords) {
        if (cwdLower.includes(keyword)) {
          keywordMatches++;
        }
      }

      if (keywordMatches > 0) {
        const keywordConfidence = Math.min(1.0, 0.7 * keywordMatches);
        confidence = Math.max(confidence, keywordConfidence);
      }
    }

    return confidence;
  }

  selectBestMatch(matches) {
    // Sort by confidence (desc), then priority (desc)
    matches.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return (b.project.priority || 0) - (a.project.priority || 0);
    });

    return matches[0];
  }

  async attributeSegment(segment, match) {
    await this.db.run(
      `UPDATE segments
       SET project_id_detected = ?,
           confidence_score = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [match.project.activecollab_project_id, match.confidence, segment.id]
    );

    this.logger.debug('Segment attributed', {
      segmentId: segment.id,
      projectId: match.project.activecollab_project_id,
      projectName: match.project.activecollab_project_name,
      confidence: match.confidence
    });
  }
}

module.exports = Attributor;
```

---

## Database Changes

Need to add unique constraint to projects_map:

```sql
-- Already in schema, but verify:
-- activecollab_project_id should be UNIQUE or PRIMARY KEY

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_map_ac_id
ON projects_map(activecollab_project_id);
```

---

## CLI Commands

### sync-projects Command

```javascript
case 'sync-projects':
  const ActiveCollabSync = require('../lib/activecollab-sync');
  const sync = new ActiveCollabSync(config, db, logger);

  console.log('Syncing ActiveCollab projects...\n');
  const count = await sync.syncProjects();
  console.log(`✓ Synced ${count} projects to database`);
  break;
```

### attribute Command

```javascript
case 'attribute':
  const Attributor = require('../lib/attributor');
  const attributor = new Attributor(db, logger, config);

  console.log('Running project attribution...\n');
  const result = await attributor.attributeSegments();

  console.log(`✓ Attributed: ${result.attributed} segments`);
  console.log(`⚠ Ambiguous: ${result.ambiguous} segments`);
  console.log(`✗ No match: ${result.noMatch} segments`);
  break;
```

---

## Test Plan

### Integration Tests

**tests/integration/attribution.test.js:**
- [ ] Exact CWD match returns confidence 1.0
- [ ] Substring CWD match returns confidence 0.9
- [ ] Keyword match returns confidence 0.7
- [ ] Multiple keywords increase confidence
- [ ] Priority selects correct project when tied
- [ ] No match returns no attribution
- [ ] Ambiguous match selects best by priority

---

## Success Criteria

✅ **Phase 2 Complete When:**
1. [ ] ActiveCollab projects loaded into projects_map
2. [ ] CWD pattern matching working
3. [ ] Keyword matching working
4. [ ] Priority-based selection working
5. [ ] Confidence scoring accurate
6. [ ] CLI sync-projects command works
7. [ ] CLI attribute command works
8. [ ] >80% correct attribution on test segments
9. [ ] Git committed with proper message

---

## Next Phase

**Phase 3A: ActiveCollab Integration (Read-Only)** - Fetch full project details, task lists, and prepare for AI-assisted analysis.
