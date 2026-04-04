# Phase 5: Review Interface (Local Web UI) - REVISED

**Status:** 📝 Documented - Ready for Implementation (OpenAI Reviewed)
**Date:** January 11, 2026
**Architecture:** Option 1 - Full Local Web Stack
**OpenAI Review:** Approved with revisions ($0.04, 43s)

---

## Objective

Build a local web-based review interface for approving, editing, and managing work segments before submission to ActiveCollab.

**Deliverables:**
- Express.js REST API backend (port 3001, bound to 127.0.0.1)
- React frontend SPA (port 3000)
- Interactive segment review workflow with state machine
- Batch operations support
- Real-time statistics dashboard

---

## OpenAI Review Summary

**Verdict:** Strong and implementation-ready after addressing 10 concerns.

**Key Changes Made:**
1. ✅ Removed undo from requirements (out of scope)
2. ✅ Defined approval status state machine
3. ✅ Added batch-skip endpoint
4. ✅ Added database indexes for performance
5. ✅ Safe JSON parsing with try/catch
6. ✅ Billing rate configuration added
7. ✅ API bound to 127.0.0.1 with strict CORS
8. ✅ Standardized error response schema
9. ✅ Clarified duration rounding rules
10. ✅ Environment variables used consistently

---

## Scope

### In Scope ✅

**Backend API:**
- ✅ RESTful API with Express.js (bound to 127.0.0.1)
- ✅ CRUD operations for segments
- ✅ Segment approval/skip/delete with state machine
- ✅ Batch approval and skip operations
- ✅ Project attribution editing
- ✅ Task description editing
- ✅ Time adjustment
- ✅ Summary statistics endpoints
- ✅ Strict CORS (localhost:3000 only)
- ✅ Standardized error responses

**Frontend UI:**
- ✅ React SPA with modern UI (Tailwind CSS)
- ✅ Segment list view with filtering
- ✅ Segment detail view with all metadata
- ✅ Inline editing (task description, time, project)
- ✅ Approval workflow (Approve/Skip/Delete)
- ✅ Batch selection and operations
- ✅ Summary dashboard (hours by project, pending count, etc.)
- ✅ Search and filter capabilities
- ✅ Responsive design (works on laptop screen)

**Development Experience:**
- ✅ Hot reload for both frontend and backend
- ✅ Clear error messages with consistent schema
- ✅ API documentation (inline comments)

### Out of Scope ❌

- ❌ User authentication (single-user local tool)
- ❌ Multi-user support
- ❌ Remote deployment (runs on localhost only)
- ❌ Mobile optimization (desktop-focused)
- ❌ Real-time websockets (polling is fine)
- ❌ Advanced analytics (basic stats only)
- ❌ Export to formats other than ActiveCollab
- ❌ **Undo functionality** (removed - adds complexity)
- ❌ Automated testing (deferred to Phase 7)

---

## Approval Status State Machine

**States:**
```
pending → approved → submitted
   ↓         ↓
 skipped   archived
   ↓
 archived
```

**State Definitions:**

| State | Description | submitted_to_ac | Editable | Submittable |
|-------|-------------|-----------------|----------|-------------|
| `pending` | New segment, needs review | 0 | ✅ Yes | ❌ No |
| `approved` | User approved, ready to submit | 0 | ✅ Yes | ✅ Yes |
| `skipped` | User skipped, won't submit | 0 | ✅ Yes | ❌ No |
| `submitted` | Pushed to ActiveCollab | 1 | ❌ No | ❌ No |
| `archived` | Soft-deleted | 0 | ❌ No | ❌ No |

**State Transitions:**

```javascript
// Valid transitions
pending → approved   // User approves
pending → skipped    // User skips
pending → archived   // User deletes
approved → skipped   // User changes mind
approved → submitted // Push to ActiveCollab (sets submitted_to_ac=1)
skipped → approved   // User un-skips
skipped → archived   // User deletes
```

**Rules:**
- Once `submitted`, segments are immutable (cannot edit or change state)
- `submitted_to_ac` is the source of truth for submission status
- `approval_status` controls UI workflow only
- When submitting: set `approval_status='submitted'` AND `submitted_to_ac=1` atomically

---

## Duration Fields Clarification

**Two fields store duration:**

| Field | Source | When Set | Purpose |
|-------|--------|----------|---------|
| `duration_minutes` | Calculated from start/end time | Phase 1 (parsing) | Original actual work time (immutable) |
| `adjusted_duration_minutes` | Rounded to 30min increments | Phase 4 (duration adjuster) | Billable time for submission |

**Rounding Rules (Phase 4):**
- 1-30 minutes → 30 minutes (0.5h)
- 31-60 minutes → 60 minutes (1.0h)
- 61-90 minutes → 90 minutes (1.5h)
- Minimum billable: 30 minutes

**Usage:**
- Display both in UI: "Original: 1.22h → Rounded: 1.50h"
- Submit `adjusted_duration_minutes` to ActiveCollab
- Allow editing `adjusted_duration_minutes` (not `duration_minutes`)

---

## Risks & Assumptions

### Risks

**Risk 1: Port conflicts**
- **Description:** Ports 3000/3001 already in use
- **Mitigation:** Make ports configurable via environment variables
- **Likelihood:** Low
- **Impact:** Low

**Risk 2: Database locking during API access**
- **Description:** Concurrent reads/writes could lock SQLite
- **Mitigation:** Use WAL mode (already enabled), connection pooling, add indexes
- **Likelihood:** Low
- **Impact:** Medium

**Risk 3: Large datasets slow down UI**
- **Description:** 1000+ segments might make UI sluggish
- **Mitigation:** Pagination (default 50), lazy loading, database indexes
- **Likelihood:** Low (current dataset ~100 segments)
- **Impact:** Medium

**Risk 4: React learning curve**
- **Description:** User/dev unfamiliar with React ecosystem
- **Mitigation:** Use simple patterns, minimal dependencies, clear documentation
- **Likelihood:** Low (Claude Code can implement)
- **Impact:** Low

### Assumptions

1. **Single user:** Only one person reviews segments at a time
2. **Local network:** No internet required, runs on 127.0.0.1 only
3. **Modern browser:** Chrome/Firefox/Edge with ES6+ support
4. **Existing data:** Phase 0-4 completed, database has segments
5. **SQLite performance:** Current dataset size (<1000 segments) performs well with indexes

---

## Requirements

### Functional Requirements

#### FR1: View Segments
- **FR1.1** Display list of all segments with key metadata (date, project, duration, status)
- **FR1.2** Filter segments by status (pending, approved, skipped, submitted, archived)
- **FR1.3** Filter segments by project
- **FR1.4** Search segments by task description
- **FR1.5** Sort by date, duration, confidence, project

#### FR2: Review Segment Details
- **FR2.1** View full segment metadata (session ID, cwd, git branch, files touched)
- **FR2.2** View task context (linked super-agent tasks)
- **FR2.3** View project attribution with confidence score
- **FR2.4** View ranked alternative projects (if ambiguous)
- **FR2.5** View original vs adjusted duration

#### FR3: Edit Segments
- **FR3.1** Edit task description (updates `task_description` field)
- **FR3.2** Adjust duration (updates `adjusted_duration_minutes`)
- **FR3.3** Override project attribution (updates `project_id_detected`)
- **FR3.4** Add notes/comments (new field: `review_notes`)
- **FR3.5** Changes saved immediately via API
- **FR3.6** Validation: Duration must be ≥1 minute, task description ≤500 chars
- **FR3.7** Cannot edit segments with `approval_status='submitted'`

#### FR4: Approve/Skip/Delete
- **FR4.1** Approve segment → sets `approval_status='approved'`
- **FR4.2** Skip segment → sets `approval_status='skipped'`
- **FR4.3** Delete segment → sets `approval_status='archived'`
- **FR4.4** Batch approve by segment IDs
- **FR4.5** Batch skip by segment IDs
- **FR4.6** Batch operations validate state transitions

#### FR5: Summary Statistics
- **FR5.1** Total hours pending approval
- **FR5.2** Hours by project (pie chart or bar chart)
- **FR5.3** Approval rate (approved / total)
- **FR5.4** Count by status (pending, approved, skipped, submitted)
- **FR5.5** Average confidence score
- **FR5.6** Total billable amount (hours × configurable rate)

#### FR6: Submission Preview
- **FR6.1** Preview what will be submitted to ActiveCollab
- **FR6.2** Show task names exactly as they'll appear
- **FR6.3** Show rounded durations
- **FR6.4** Group by project
- **FR6.5** Export preview as JSON

### Non-Functional Requirements

#### NFR1: Performance
- **NFR1.1** API response time <200ms for list queries (with indexes)
- **NFR1.2** API response time <50ms for single segment queries
- **NFR1.3** UI renders segment list in <1 second (100 segments with pagination)
- **NFR1.4** Editing feels instant (<100ms perceived latency)

#### NFR2: Reliability
- **NFR2.1** API errors return standardized error schema (see below)
- **NFR2.2** Database transaction failures rollback cleanly
- **NFR2.3** Frontend handles API errors gracefully (shows error toast)
- **NFR2.4** No data loss on browser refresh

#### NFR3: Usability
- **NFR3.1** Keyboard shortcuts for common actions (a=approve, s=skip, d=delete)
- **NFR3.2** Visual feedback on hover/click
- **NFR3.3** Clear status indicators (color-coded badges)
- **NFR3.4** Confirmation dialogs for destructive actions (delete)

#### NFR4: Security
- **NFR4.1** API bound to 127.0.0.1 only (not 0.0.0.0)
- **NFR4.2** CORS restricted to http://localhost:3000 only
- **NFR4.3** Input validation on all endpoints
- **NFR4.4** SQL injection prevention (parameterized queries)

#### NFR5: Maintainability
- **NFR5.1** API routes clearly documented with comments
- **NFR5.2** React components modular and reusable
- **NFR5.3** CSS organized with Tailwind utility classes
- **NFR5.4** Configuration in environment variables

---

## Implementation Plan

### File Structure

```
/home/mp/awesome/smart-work-tracker/
├── src/
│   ├── api/
│   │   ├── server.js              # Express app entry point
│   │   ├── routes/
│   │   │   ├── segments.js        # Segment CRUD routes
│   │   │   ├── projects.js        # Project list routes
│   │   │   ├── stats.js           # Statistics routes
│   │   │   └── submit.js          # Submission preview routes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Centralized error handling
│   │   │   └── validation.js      # Request validation
│   │   └── controllers/
│   │       ├── segmentController.js
│   │       ├── projectController.js
│   │       └── statsController.js
│   └── lib/                       # Existing libs (database.js, etc.)
│
├── web-ui/                        # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx                # Main app component
│   │   ├── index.jsx              # Entry point
│   │   ├── api/
│   │   │   └── client.js          # API client (axios)
│   │   ├── components/
│   │   │   ├── SegmentList.jsx    # List view
│   │   │   ├── SegmentCard.jsx    # Individual segment card
│   │   │   ├── SegmentDetail.jsx  # Detail modal/panel
│   │   │   ├── EditSegment.jsx    # Inline edit form
│   │   │   ├── BatchActions.jsx   # Batch operation toolbar
│   │   │   ├── FilterBar.jsx      # Filter/search controls
│   │   │   ├── Dashboard.jsx      # Statistics dashboard
│   │   │   └── SubmitPreview.jsx  # Submission preview
│   │   ├── hooks/
│   │   │   ├── useSegments.js     # Fetch segments
│   │   │   └── useStats.js        # Fetch statistics
│   │   ├── utils/
│   │   │   ├── formatters.js      # Date, time formatters
│   │   │   ├── validators.js      # Form validation
│   │   │   └── safeJsonParse.js   # Safe JSON parsing
│   │   └── styles/
│   │       └── index.css          # Tailwind + custom CSS
│   ├── package.json
│   └── vite.config.js             # Vite build config
│
├── package.json                   # Updated with new scripts
└── .env.example                   # Updated with API config
```

### Database Changes

**Migration 014: Add review fields + indexes**

```sql
-- migrations/014-add-review-fields-and-indexes.sql

-- Add review fields
ALTER TABLE segments ADD COLUMN review_notes TEXT;
ALTER TABLE segments ADD COLUMN reviewed_at DATETIME;
ALTER TABLE segments ADD COLUMN reviewed_by TEXT DEFAULT 'user';
ALTER TABLE segments ADD COLUMN approval_status TEXT DEFAULT 'pending'
  CHECK(approval_status IN ('pending', 'approved', 'skipped', 'submitted', 'archived'));

-- Add indexes for performance (OpenAI feedback #4)
CREATE INDEX IF NOT EXISTS idx_segments_approval_status ON segments(approval_status);
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments(project_id_detected);
CREATE INDEX IF NOT EXISTS idx_segments_start_time ON segments(start_time);
CREATE INDEX IF NOT EXISTS idx_segments_submitted ON segments(submitted_to_ac);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_segments_status_project
  ON segments(approval_status, project_id_detected);
```

**Migration 014 Down:**
```sql
-- migrations/014-add-review-fields-and-indexes.down.sql
DROP INDEX IF EXISTS idx_segments_approval_status;
DROP INDEX IF EXISTS idx_segments_project_id;
DROP INDEX IF EXISTS idx_segments_start_time;
DROP INDEX IF EXISTS idx_segments_submitted;
DROP INDEX IF EXISTS idx_segments_status_project;

-- SQLite doesn't support DROP COLUMN
-- Would need table recreation for full rollback
```

---

### Standardized Error Response Schema

**All API errors return this format:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Task description exceeds 500 characters",
    "details": {
      "field": "task_description",
      "maxLength": 500,
      "actualLength": 543
    },
    "timestamp": "2026-01-11T20:00:00Z"
  }
}
```

**HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `404` - Not Found (segment doesn't exist)
- `409` - Conflict (invalid state transition)
- `500` - Internal Server Error (database errors)

**Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `INVALID_STATE_TRANSITION` - Cannot change to requested state
- `DATABASE_ERROR` - Database operation failed
- `ALREADY_SUBMITTED` - Cannot edit submitted segment

---

### Backend API Design

#### Base URL: `http://127.0.0.1:3001/api`

**Security Configuration:**
```javascript
// Bind to localhost only (not 0.0.0.0)
app.listen(3001, '127.0.0.1', () => {
  console.log('API listening on http://127.0.0.1:3001');
});

// Strict CORS
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: false
}));
```

---

#### **GET /segments**
**Query params:**
- `status` (optional): pending | approved | skipped | submitted | archived
- `project_id` (optional): filter by project
- `search` (optional): search task description
- `limit` (optional): pagination limit (default: 50)
- `offset` (optional): pagination offset (default: 0)
- `sort` (optional): date | duration | confidence (default: date)
- `order` (optional): asc | desc (default: desc)

**Response:**
```json
{
  "segments": [
    {
      "id": 123,
      "source_id": 45,
      "start_time": "2026-01-10T14:30:00Z",
      "end_time": "2026-01-10T15:45:00Z",
      "duration_minutes": 75,
      "adjusted_duration_minutes": 90,
      "cwd": "/home/mp/awesome/super-agent",
      "git_branch": "main",
      "files_touched": ["src/index.js", "config.js"],
      "commands_run": ["npm start", "git status"],
      "project_id_detected": 13,
      "project_name": "BreakThrough3x.com",
      "confidence_score": 0.85,
      "task_description": "Fix domain detection headers",
      "task_context": "{\"taskIds\": [...], \"matchedProjects\": [...]}",
      "approval_status": "pending",
      "review_notes": null,
      "submitted_to_ac": 0,
      "ac_task_id": null,
      "ac_time_record_id": null
    }
  ],
  "total": 91,
  "limit": 50,
  "offset": 0
}
```

---

#### **GET /segments/:id**
**Response:** Single segment object (same structure as above)

**Error (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Segment with id 999 not found",
    "timestamp": "2026-01-11T20:00:00Z"
  }
}
```

---

#### **PATCH /segments/:id**
**Body:**
```json
{
  "task_description": "Updated task name",
  "adjusted_duration_minutes": 120,
  "project_id_detected": 13,
  "review_notes": "Client confirmed this was for Breakthrough"
}
```

**Response:**
```json
{
  "success": true,
  "segment": { /* updated segment */ }
}
```

**Validation:**
- `adjusted_duration_minutes` ≥ 1
- `task_description` ≤ 500 chars
- `project_id_detected` exists in projects_map
- Cannot edit if `approval_status='submitted'`

**Error (409 - Already Submitted):**
```json
{
  "error": {
    "code": "ALREADY_SUBMITTED",
    "message": "Cannot edit segment after submission to ActiveCollab",
    "details": {
      "segment_id": 123,
      "submitted_at": "2026-01-10T15:00:00Z"
    },
    "timestamp": "2026-01-11T20:00:00Z"
  }
}
```

---

#### **POST /segments/:id/approve**
**Response:**
```json
{
  "success": true,
  "message": "Segment approved",
  "segment": { /* updated segment */ }
}
```

**Side effects:**
- Sets `approval_status = 'approved'`
- Sets `reviewed_at = CURRENT_TIMESTAMP`

**State Validation:**
- Can only approve from: `pending`, `skipped`
- Cannot approve if already `submitted` or `archived`

---

#### **POST /segments/:id/skip**
**Response:** Same as approve
**Side effects:** Sets `approval_status = 'skipped'`

---

#### **DELETE /segments/:id**
**Response:** Same as approve
**Side effects:** Sets `approval_status = 'archived'` (soft delete)

---

#### **POST /segments/batch-approve**
**Body:**
```json
{
  "segment_ids": [1, 2, 3, 4]
}
```

**Response:**
```json
{
  "success": true,
  "approved_count": 4,
  "segment_ids": [1, 2, 3, 4],
  "errors": []
}
```

**Note:** If some segments fail validation, returns partial success:
```json
{
  "success": true,
  "approved_count": 3,
  "segment_ids": [1, 2, 3],
  "errors": [
    {
      "segment_id": 4,
      "error": "Already submitted"
    }
  ]
}
```

---

#### **POST /segments/batch-skip** (Added per OpenAI feedback #3)
**Body:**
```json
{
  "segment_ids": [5, 6, 7]
}
```

**Response:** Same structure as batch-approve

---

#### **GET /projects**
**Response:**
```json
{
  "projects": [
    {
      "id": 13,
      "activecollab_project_id": 13,
      "activecollab_project_name": "BreakThrough3x.com",
      "keywords": ["breakthrough", "dan kuschel", "sales-prediction"]
    }
  ]
}
```

---

#### **GET /stats/summary**
**Response:**
```json
{
  "total_segments": 91,
  "pending": 45,
  "approved": 40,
  "skipped": 2,
  "submitted": 4,
  "archived": 0,
  "total_hours_pending": 52.5,
  "total_hours_approved": 64.0,
  "avg_confidence": 0.75,
  "billable_amount": 6400.00,
  "by_project": [
    {
      "project_id": 13,
      "project_name": "BreakThrough3x.com",
      "segment_count": 9,
      "total_hours": 8.0,
      "avg_confidence": 0.82
    }
  ]
}
```

---

#### **GET /stats/timeline**
**Query params:** `days` (default: 30)

**Response:**
```json
{
  "timeline": [
    {
      "date": "2026-01-10",
      "hours": 5.5,
      "segment_count": 7
    }
  ]
}
```

---

#### **GET /submit/preview**
**Query params:** `status=approved` (optional filter)

**Response:**
```json
{
  "segments_to_submit": [
    {
      "segment_id": 123,
      "project_id": 13,
      "project_name": "BreakThrough3x.com",
      "task_name": "Fix domain detection headers (st)",
      "hours": 1.5,
      "date": "2026-01-10"
    }
  ],
  "total_hours": 64.0,
  "total_billable": 6400.00,
  "segment_count": 40
}
```

---

### Frontend Components

#### **Safe JSON Parsing Utility** (OpenAI feedback #5)

```javascript
// src/utils/safeJsonParse.js
export function safeJsonParse(jsonString, fallback = null) {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn('Failed to parse JSON:', err.message);
    return fallback;
  }
}
```

---

#### **API Client with Environment Variables** (OpenAI feedback #10)

```javascript
// web-ui/src/api/client.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error interceptor for standardized error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.data?.error) {
      // Backend returned standardized error
      return Promise.reject(error.response.data.error);
    }
    // Network or other error
    return Promise.reject({
      code: 'NETWORK_ERROR',
      message: error.message || 'Network request failed'
    });
  }
);
```

---

#### **useSegments Hook with Environment Variables**

```javascript
// web-ui/src/hooks/useSegments.js
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function useSegments(filters = {}) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await apiClient.get(`/segments?${params}`);
      setSegments(res.data.segments);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [JSON.stringify(filters)]);

  return { segments, loading, error, refetch: fetchSegments };
}
```

---

#### **App.jsx** (Main Layout)
```jsx
import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SegmentList } from './components/SegmentList';
import { SubmitPreview } from './components/SubmitPreview';

function App() {
  const [activeView, setActiveView] = useState('list'); // list | dashboard | preview

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-2 ${activeView === 'list' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Segments
              </button>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-2 ${activeView === 'dashboard' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`px-3 py-2 ${activeView === 'preview' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Submit Preview
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'list' && <SegmentList />}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'preview' && <SubmitPreview />}
      </main>
    </div>
  );
}

export default App;
```

---

#### **SegmentList.jsx**
```jsx
import React, { useState } from 'react';
import { useSegments } from '../hooks/useSegments';
import { SegmentCard } from './SegmentCard';
import { FilterBar } from './FilterBar';
import { BatchActions } from './BatchActions';

export function SegmentList() {
  const [filters, setFilters] = useState({ status: 'pending' });
  const [selected, setSelected] = useState([]);
  const { segments, loading, error, refetch } = useSegments(filters);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error.message}</div>;

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />

      {selected.length > 0 && (
        <BatchActions
          selected={selected}
          onComplete={() => {
            setSelected([]);
            refetch();
          }}
        />
      )}

      <div className="space-y-4">
        {segments.map(seg => (
          <SegmentCard
            key={seg.id}
            segment={seg}
            selected={selected.includes(seg.id)}
            onSelect={(id) => setSelected(prev =>
              prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
            )}
            onUpdate={refetch}
          />
        ))}
      </div>
    </div>
  );
}
```

---

#### **SegmentCard.jsx** (With Safe JSON Parsing)

```jsx
import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { formatDuration, formatDate } from '../utils/formatters';
import { safeJsonParse } from '../utils/safeJsonParse';

export function SegmentCard({ segment, selected, onSelect, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [taskDesc, setTaskDesc] = useState(segment.task_description);
  const [error, setError] = useState(null);

  // Safe JSON parsing (OpenAI feedback #5)
  const taskContext = safeJsonParse(segment.task_context, {});
  const taskSummary = taskContext.taskSummaries?.[0]?.substring(0, 100);

  const handleApprove = async () => {
    try {
      await apiClient.post(`/segments/${segment.id}/approve`);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    try {
      await apiClient.patch(`/segments/${segment.id}`, {
        task_description: taskDesc
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const isSubmitted = segment.approval_status === 'submitted';

  return (
    <div className={`
      bg-white rounded-lg shadow p-4
      ${selected ? 'ring-2 ring-blue-500' : ''}
      ${isSubmitted ? 'opacity-60' : ''}
    `}>
      {error && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(segment.id)}
            disabled={isSubmitted}
            className="mt-1"
          />

          <div className="flex-1">
            {/* Date & Duration */}
            <div className="text-sm text-gray-500">
              {formatDate(segment.start_time)} •
              Original: {formatDuration(segment.duration_minutes)} →
              Rounded: {formatDuration(segment.adjusted_duration_minutes)}
            </div>

            {/* Project */}
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {segment.project_name || 'Unattributed'}
              </span>
              {segment.confidence_score && (
                <span className="ml-2 text-xs text-gray-500">
                  {(segment.confidence_score * 100).toFixed(0)}% confident
                </span>
              )}
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                segment.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                segment.approval_status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                segment.approval_status === 'submitted' ? 'bg-gray-100 text-gray-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {segment.approval_status}
              </span>
            </div>

            {/* Task Description */}
            <div className="mt-2">
              {editing ? (
                <input
                  type="text"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  maxLength={500}
                  className="w-full border rounded px-2 py-1"
                  autoFocus
                />
              ) : (
                <p className="text-gray-900">
                  {segment.task_description || 'Development work'}
                </p>
              )}
            </div>

            {/* Task Context Summary */}
            {taskSummary && (
              <div className="mt-2 text-xs text-gray-500">
                {taskSummary}...
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {isSubmitted ? (
            <span className="text-xs text-gray-500">Submitted</span>
          ) : editing ? (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setTaskDesc(segment.task_description);
                }}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Edit
              </button>
              <button
                onClick={handleApprove}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

#### **Dashboard.jsx** (With Billing Rate from Config)

```jsx
import React from 'react';
import { useStats } from '../hooks/useStats';

export function Dashboard() {
  const { stats, loading } = useStats();

  // Get billing rate from environment (OpenAI feedback #6)
  const billingRate = parseFloat(import.meta.env.VITE_BILLING_RATE_DEFAULT) || 100;

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Hours Pending"
          value={stats.total_hours_pending}
          format="hours"
        />
        <StatCard
          label="Approved Segments"
          value={stats.approved}
        />
        <StatCard
          label="Avg Confidence"
          value={(stats.avg_confidence * 100).toFixed(0)}
          suffix="%"
        />
        <StatCard
          label="Billable Amount"
          value={stats.total_hours_approved * billingRate}
          format="currency"
        />
      </div>

      {/* By Project */}
      <h2 className="text-xl font-semibold mb-4">Hours by Project</h2>
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left">Project</th>
              <th className="px-6 py-3 text-right">Segments</th>
              <th className="px-6 py-3 text-right">Hours</th>
              <th className="px-6 py-3 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {stats.by_project.map(proj => (
              <tr key={proj.project_id} className="border-b">
                <td className="px-6 py-4">{proj.project_name}</td>
                <td className="px-6 py-4 text-right">{proj.segment_count}</td>
                <td className="px-6 py-4 text-right">{proj.total_hours.toFixed(2)}h</td>
                <td className="px-6 py-4 text-right">{(proj.avg_confidence * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, format, suffix }) {
  const formatted = format === 'hours' ? `${value.toFixed(2)}h`
    : format === 'currency' ? `$${value.toFixed(2)}`
    : value + (suffix || '');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-2">{formatted}</div>
    </div>
  );
}
```

---

### Package.json Updates

```json
{
  "scripts": {
    "dev:api": "nodemon src/api/server.js",
    "dev:ui": "cd web-ui && npm run dev",
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:ui\"",
    "build:ui": "cd web-ui && npm run build",
    "start:api": "node src/api/server.js",
    "start:ui": "cd web-ui && npm run preview"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "concurrently": "^8.2.2"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

---

### Environment Configuration Updates

**.env.example:**
```bash
# Database
DATABASE_PATH=./data/smart-work-tracker.db

# ActiveCollab API
AC_API_URL=https://app.activecollab.com/YOUR_ID
AC_API_TOKEN=your-token-here
AC_USER_ID=123
AC_JOB_TYPE_ID=1

# Phase 5: API Server
API_PORT=3001
API_HOST=127.0.0.1
CORS_ORIGIN=http://localhost:3000

# Phase 5: Billing Configuration (OpenAI feedback #6)
BILLING_RATE_DEFAULT=100

# Phase 5: Frontend (web-ui/.env)
VITE_API_URL=http://localhost:3001/api
VITE_BILLING_RATE_DEFAULT=100
```

---

## Test Plan

### Unit Tests (Deferred to Phase 7)

**Backend:**
- Segment controller methods
- Validation middleware
- Error handling
- State machine transitions

**Frontend:**
- Component rendering
- API client methods
- Form validation
- Safe JSON parsing

### Integration Tests

**API Endpoints:**
```bash
# Manual testing with curl

# GET segments
curl http://127.0.0.1:3001/api/segments?status=pending

# PATCH segment
curl -X PATCH http://127.0.0.1:3001/api/segments/1 \
  -H "Content-Type: application/json" \
  -d '{"task_description": "Updated task"}'

# Approve segment
curl -X POST http://127.0.0.1:3001/api/segments/1/approve

# Batch approve
curl -X POST http://127.0.0.1:3001/api/segments/batch-approve \
  -H "Content-Type: application/json" \
  -d '{"segment_ids": [1, 2, 3]}'

# Batch skip (OpenAI feedback #3)
curl -X POST http://127.0.0.1:3001/api/segments/batch-skip \
  -H "Content-Type: application/json" \
  -d '{"segment_ids": [4, 5]}'

# Get stats
curl http://127.0.0.1:3001/api/stats/summary

# Test error handling
curl -X PATCH http://127.0.0.1:3001/api/segments/999 \
  -H "Content-Type: application/json" \
  -d '{"task_description": "test"}'
# Should return 404 with standardized error format
```

### Manual Testing Checklist

**Backend:**
- [ ] API server starts on 127.0.0.1:3001 (not 0.0.0.0)
- [ ] All endpoints return valid JSON
- [ ] Database queries execute with indexes (<200ms)
- [ ] CORS allows localhost:3000 only
- [ ] CORS blocks other origins
- [ ] Error responses follow standardized schema
- [ ] Validation rejects invalid inputs
- [ ] State transitions follow state machine rules
- [ ] Cannot edit submitted segments

**Frontend:**
- [ ] UI loads without console errors
- [ ] API client uses VITE_API_URL from env
- [ ] Segment list displays all pending segments
- [ ] Filtering by status works
- [ ] Editing task description saves correctly
- [ ] JSON parsing doesn't crash on malformed data
- [ ] Approve button updates status
- [ ] Submitted segments are grayed out and non-editable
- [ ] Batch approve selects multiple segments
- [ ] Batch skip works correctly
- [ ] Dashboard shows correct statistics
- [ ] Dashboard uses VITE_BILLING_RATE_DEFAULT
- [ ] Submit preview matches expected output
- [ ] Error toasts display on API errors

**End-to-End:**
- [ ] Parse sessions → segments appear in UI
- [ ] Edit segment in UI → changes persist in DB
- [ ] Approve segments → submission preview includes them
- [ ] Submit to AC → segments marked as submitted
- [ ] Cannot edit after submission

---

## Migration Plan

### Database Changes

```bash
# Run migration
npm run migrate

# Verify new columns and indexes
npm start status
sqlite3 data/smart-work-tracker.db ".schema segments"
sqlite3 data/smart-work-tracker.db ".indexes segments"
```

**Migration 014** adds:
- `review_notes` TEXT
- `reviewed_at` DATETIME
- `reviewed_by` TEXT
- `approval_status` TEXT (with CHECK constraint)
- 5 indexes for performance

### Package Installation

```bash
# Install backend dependencies
npm install express cors

# Install dev dependencies
npm install -D nodemon concurrently

# Initialize React frontend
cd web-ui
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios
cd ..
```

### Configuration Updates

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your values
nano .env

# Create web-ui/.env
cat > web-ui/.env << EOF
VITE_API_URL=http://localhost:3001/api
VITE_BILLING_RATE_DEFAULT=100
EOF
```

---

## Success Criteria

### Phase 5 Complete When:

- [x] **Backend API:**
  - [ ] Express server runs on 127.0.0.1:3001 (not 0.0.0.0)
  - [ ] All 12 endpoints implemented and tested
  - [ ] CORS restricted to localhost:3000 only
  - [ ] Standardized error responses implemented
  - [ ] Database queries optimized with indexes (<200ms)
  - [ ] State machine enforced for status transitions

- [x] **Frontend UI:**
  - [ ] React app runs on localhost:3000
  - [ ] Uses VITE_API_URL from environment
  - [ ] Segment list view displays all segments
  - [ ] Filtering and search work correctly
  - [ ] Inline editing saves changes
  - [ ] Safe JSON parsing prevents crashes
  - [ ] Approve/Skip/Delete buttons work with state validation
  - [ ] Batch operations work (approve and skip)
  - [ ] Dashboard shows accurate statistics with configured rate
  - [ ] Submit preview matches actual submission
  - [ ] Submitted segments are immutable

- [x] **User Experience:**
  - [ ] Can review 10 segments in <2 minutes
  - [ ] UI feels responsive (<100ms perceived latency)
  - [ ] Clear visual feedback on actions
  - [ ] No console errors or warnings
  - [ ] Works in Chrome/Firefox/Edge
  - [ ] Error toasts show clear messages

- [x] **Data Integrity:**
  - [ ] Edits don't affect raw data (sources table immutable)
  - [ ] Approval status updates follow state machine
  - [ ] Submission preview matches what would be sent to AC
  - [ ] Browser refresh doesn't lose pending changes
  - [ ] Cannot edit submitted segments

- [x] **Security & Performance:**
  - [ ] API bound to 127.0.0.1 only
  - [ ] CORS restricted to localhost:3000
  - [ ] Database indexes created
  - [ ] All queries <200ms
  - [ ] No SQL injection vulnerabilities

---

## Dependencies

### Required:
- ✅ Phase 0: Database foundation with migrations
- ✅ Phase 1: Session parsing populates segments
- ✅ Phase 2: Project attribution provides project mappings
- ✅ Phase 4: Submission system ready to accept approved segments

### Technical:
- Node.js v18+
- npm or yarn
- Modern browser with ES6+ support
- SQLite3 with WAL mode enabled

---

## Estimated Effort

**Implementation:** 10-14 hours (increased from 8-12 due to revisions)
- Backend API: 4-5 hours (was 3-4, +1h for state machine + error schema)
- Frontend setup: 2-3 hours
- Component development: 4-5 hours (was 3-4, +1h for safe parsing + env vars)
- Testing & refinement: 2-3 hours (was 1-2, +1h for additional validation)

**Breakdown:**
- Migration & DB setup: 1 hour (was 30min, +30min for indexes)
- Express API routes: 3 hours (was 2h, +1h for error schema + state validation)
- React app scaffolding: 1 hour
- SegmentList component: 1.5 hours
- SegmentCard component: 1.5 hours (was 1h, +30min for safe parsing)
- Dashboard component: 1.5 hours (was 1h, +30min for billing config)
- FilterBar & BatchActions: 1.5 hours (was 1h, +30min for batch-skip)
- API client hooks: 1 hour
- Styling with Tailwind: 1.5 hours
- Testing & bug fixes: 2 hours (was 1.5h, +30min for state machine validation)

---

## Status

- [x] Documented
- [x] Reviewed (OpenAI) - ✅ Approved with revisions
- [ ] Revised - ✅ Complete
- [ ] Implemented
- [ ] Tested
- [ ] Approved
- [ ] Released & Tagged

---

## Completion

**Completed:** TBD
**Tag:** `v0.5.0-phase5`
**Deviations:** TBD
**Lessons Learned:** TBD

---

## OpenAI Review Notes

**Date:** January 11, 2026
**Cost:** $0.04
**Duration:** 43 seconds

**All 10 concerns addressed:**
1. ✅ Removed undo from requirements (scope clarified)
2. ✅ Defined approval status state machine with transitions
3. ✅ Added batch-skip endpoint
4. ✅ Added 5 database indexes for performance
5. ✅ Implemented safe JSON parsing utility
6. ✅ Added billing rate to environment configuration
7. ✅ API bound to 127.0.0.1 with strict CORS
8. ✅ Standardized error response schema defined
9. ✅ Clarified duration rounding rules and field usage
10. ✅ Used environment variables consistently in all code

---

## Next Steps After Phase 5

1. **Implement Phase 5** - Build the web UI according to this spec
2. **Test thoroughly** - All manual tests must pass
3. **User acceptance** - Review with user before tagging
4. **Tag release** - `v0.5.0-phase5` when complete
5. **Consider Phase 6** - If batch processing becomes tedious
6. **Consider Phase 3B** - If attribution accuracy drops below 80%
7. **Polish (Phase 7)** - When ready for long-term maintenance

---

## References

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- Smart Work Tracker Development Framework: `docs/00-DEVELOPMENT-FRAMEWORK.md`
- OpenAI Review Response: `tasks/responses/archive/1768162075090.json`
