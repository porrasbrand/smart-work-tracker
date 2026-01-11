# Phase 5: Review Interface (Local Web UI)

**Status:** 📝 Documented - Ready for Implementation
**Date:** January 11, 2026
**Architecture:** Option 1 - Full Local Web Stack

---

## Objective

Build a local web-based review interface for approving, editing, and managing work segments before submission to ActiveCollab.

**Deliverables:**
- Express.js REST API backend (port 3001)
- React frontend SPA (port 3000)
- Interactive segment review workflow
- Batch operations support
- Real-time statistics dashboard

---

## Scope

### In Scope ✅

**Backend API:**
- ✅ RESTful API with Express.js
- ✅ CRUD operations for segments
- ✅ Segment approval/skip/delete
- ✅ Batch approval operations
- ✅ Project attribution editing
- ✅ Task description editing
- ✅ Time adjustment
- ✅ Summary statistics endpoints
- ✅ CORS enabled for localhost

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
- ✅ Clear error messages
- ✅ API documentation (inline comments)

### Out of Scope ❌

- ❌ User authentication (single-user local tool)
- ❌ Multi-user support
- ❌ Remote deployment (runs on localhost only)
- ❌ Mobile optimization (desktop-focused)
- ❌ Real-time websockets (polling is fine)
- ❌ Advanced analytics (basic stats only)
- ❌ Export to formats other than ActiveCollab
- ❌ Undo/redo history
- ❌ Automated testing (deferred to Phase 7)

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
- **Mitigation:** Use WAL mode (already enabled in Phase 0), connection pooling
- **Likelihood:** Low
- **Impact:** Medium

**Risk 3: Large datasets slow down UI**
- **Description:** 1000+ segments might make UI sluggish
- **Mitigation:** Pagination, lazy loading, virtual scrolling
- **Likelihood:** Low (current dataset ~100 segments)
- **Impact:** Medium

**Risk 4: React learning curve**
- **Description:** User/dev unfamiliar with React ecosystem
- **Mitigation:** Use simple patterns, minimal dependencies, clear documentation
- **Likelihood:** Low (Claude Code can implement)
- **Impact:** Low

### Assumptions

1. **Single user:** Only one person reviews segments at a time
2. **Local network:** No internet required, runs on localhost
3. **Modern browser:** Chrome/Firefox/Edge with ES6+ support
4. **Existing data:** Phase 0-4 completed, database has segments
5. **SQLite performance:** Current dataset size (<1000 segments) performs well with SQLite

---

## Requirements

### Functional Requirements

#### FR1: View Segments
- **FR1.1** Display list of all segments with key metadata (date, project, duration, status)
- **FR1.2** Filter segments by status (pending, approved, submitted, archived)
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

#### FR4: Approve/Skip/Delete
- **FR4.1** Approve segment → marks as ready for submission
- **FR4.2** Skip segment → marks as skipped (won't submit)
- **FR4.3** Delete segment → soft delete (marks as archived)
- **FR4.4** Batch approve high-confidence segments (confidence ≥0.8)
- **FR4.5** Batch skip low-confidence segments (confidence <0.6)
- **FR4.6** Undo last action (within session)

#### FR5: Summary Statistics
- **FR5.1** Total hours pending approval
- **FR5.2** Hours by project (pie chart or bar chart)
- **FR5.3** Approval rate (approved / total)
- **FR5.4** Count by status (pending, approved, skipped, submitted)
- **FR5.5** Average confidence score
- **FR5.6** Total billable amount (hours × rate)

#### FR6: Submission Preview
- **FR6.1** Preview what will be submitted to ActiveCollab
- **FR6.2** Show task names exactly as they'll appear
- **FR6.3** Show rounded durations
- **FR6.4** Group by project
- **FR6.5** Export preview as JSON

### Non-Functional Requirements

#### NFR1: Performance
- **NFR1.1** API response time <200ms for list queries
- **NFR1.2** API response time <50ms for single segment queries
- **NFR1.3** UI renders segment list in <1 second (100 segments)
- **NFR1.4** Editing feels instant (<100ms perceived latency)

#### NFR2: Reliability
- **NFR2.1** API errors return clear error messages
- **NFR2.2** Database transaction failures rollback cleanly
- **NFR2.3** Frontend handles API errors gracefully (shows error toast)
- **NFR2.4** No data loss on browser refresh

#### NFR3: Usability
- **NFR3.1** Keyboard shortcuts for common actions (a=approve, s=skip, d=delete)
- **NFR3.2** Visual feedback on hover/click
- **NFR3.3** Clear status indicators (color-coded badges)
- **NFR3.4** Undo last action within 5 seconds

#### NFR4: Maintainability
- **NFR4.1** API routes clearly documented with comments
- **NFR4.2** React components modular and reusable
- **NFR4.3** CSS organized with Tailwind utility classes
- **NFR4.4** Configuration in environment variables

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
│   │   │   ├── useStats.js        # Fetch statistics
│   │   │   └── useUndo.js         # Undo functionality
│   │   ├── utils/
│   │   │   ├── formatters.js      # Date, time formatters
│   │   │   └── validators.js      # Form validation
│   │   └── styles/
│   │       └── index.css          # Tailwind + custom CSS
│   ├── package.json
│   └── vite.config.js             # Vite build config
│
├── package.json                   # Updated with new scripts
└── .env.example                   # Updated with API config
```

### Database Changes

**Migration 014: Add review fields**

```sql
-- migrations/014-add-review-fields.sql
ALTER TABLE segments ADD COLUMN review_notes TEXT;
ALTER TABLE segments ADD COLUMN reviewed_at DATETIME;
ALTER TABLE segments ADD COLUMN reviewed_by TEXT DEFAULT 'user';
ALTER TABLE segments ADD COLUMN approval_status TEXT DEFAULT 'pending'
  CHECK(approval_status IN ('pending', 'approved', 'skipped', 'submitted', 'archived'));
```

**Migration 014 Down:**
```sql
-- migrations/014-add-review-fields.down.sql
-- SQLite doesn't support DROP COLUMN, so we create new table without these columns
-- (Only needed if we want to rollback Phase 5)
```

### Backend API Design

#### Base URL: `http://localhost:3001/api`

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

---

#### **PATCH /segments/:id**
**Body:**
```json
{
  "task_description": "Updated task name",
  "adjusted_duration_minutes": 120,
  "project_id_detected": 13,
  "review_notes": "Client confirmed this was for Breakthrough",
  "approval_status": "approved"
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
- `approval_status` in allowed values

---

#### **POST /segments/:id/approve**
**Response:**
```json
{
  "success": true,
  "message": "Segment approved"
}
```

**Side effects:**
- Sets `approval_status = 'approved'`
- Sets `reviewed_at = CURRENT_TIMESTAMP`

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
  "segment_ids": [1, 2, 3, 4],
  "min_confidence": 0.8  // optional filter
}
```

**Response:**
```json
{
  "success": true,
  "approved_count": 4,
  "segment_ids": [1, 2, 3, 4]
}
```

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
              <button onClick={() => setActiveView('list')}>
                Segments
              </button>
              <button onClick={() => setActiveView('dashboard')}>
                Dashboard
              </button>
              <button onClick={() => setActiveView('preview')}>
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
```

---

#### **SegmentList.jsx**
```jsx
import React, { useState, useEffect } from 'react';
import { useSegments } from '../hooks/useSegments';
import { SegmentCard } from './SegmentCard';
import { FilterBar } from './FilterBar';
import { BatchActions } from './BatchActions';

export function SegmentList() {
  const [filters, setFilters] = useState({ status: 'pending' });
  const [selected, setSelected] = useState([]);
  const { segments, loading, error, refetch } = useSegments(filters);

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

#### **SegmentCard.jsx**
```jsx
import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { formatDuration, formatDate } from '../utils/formatters';

export function SegmentCard({ segment, selected, onSelect, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [taskDesc, setTaskDesc] = useState(segment.task_description);

  const handleApprove = async () => {
    await apiClient.post(`/segments/${segment.id}/approve`);
    onUpdate();
  };

  const handleSave = async () => {
    await apiClient.patch(`/segments/${segment.id}`, {
      task_description: taskDesc
    });
    setEditing(false);
    onUpdate();
  };

  return (
    <div className={`
      bg-white rounded-lg shadow p-4
      ${selected ? 'ring-2 ring-blue-500' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(segment.id)}
            className="mt-1"
          />

          <div className="flex-1">
            {/* Date & Duration */}
            <div className="text-sm text-gray-500">
              {formatDate(segment.start_time)} •
              {formatDuration(segment.duration_minutes)} →
              {formatDuration(segment.adjusted_duration_minutes)} (rounded)
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
            </div>

            {/* Task Description */}
            <div className="mt-2">
              {editing ? (
                <input
                  type="text"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  autoFocus
                />
              ) : (
                <p className="text-gray-900">
                  {segment.task_description || 'Development work'}
                </p>
              )}
            </div>

            {/* Task Context */}
            {segment.task_context && (
              <div className="mt-2 text-xs text-gray-500">
                {JSON.parse(segment.task_context).taskSummaries?.[0]?.substring(0, 100)}...
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {editing ? (
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

#### **Dashboard.jsx**
```jsx
import React from 'react';
import { useStats } from '../hooks/useStats';

export function Dashboard() {
  const { stats, loading } = useStats();

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
          value={stats.total_hours_approved * 100}
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

### API Client (hooks/useSegments.js)

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export function useSegments(filters = {}) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await axios.get(`${API_BASE}/segments?${params}`);
      setSegments(res.data.segments);
      setError(null);
    } catch (err) {
      setError(err.message);
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

## Test Plan

### Unit Tests (Deferred to Phase 7)

**Backend:**
- Segment controller methods
- Validation middleware
- Error handling

**Frontend:**
- Component rendering
- API client methods
- Form validation

### Integration Tests

**API Endpoints:**
```bash
# Manual testing with curl

# GET segments
curl http://localhost:3001/api/segments?status=pending

# PATCH segment
curl -X PATCH http://localhost:3001/api/segments/1 \
  -H "Content-Type: application/json" \
  -d '{"task_description": "Updated task"}'

# Approve segment
curl -X POST http://localhost:3001/api/segments/1/approve

# Get stats
curl http://localhost:3001/api/stats/summary
```

### Manual Testing Checklist

**Backend:**
- [ ] API server starts without errors
- [ ] All endpoints return valid JSON
- [ ] Database queries execute successfully
- [ ] CORS allows localhost:3000 requests
- [ ] Error responses have proper status codes
- [ ] Validation rejects invalid inputs

**Frontend:**
- [ ] UI loads without console errors
- [ ] Segment list displays all pending segments
- [ ] Filtering by status works
- [ ] Editing task description saves correctly
- [ ] Approve button updates status
- [ ] Batch approve selects multiple segments
- [ ] Dashboard shows correct statistics
- [ ] Submit preview matches expected output

**End-to-End:**
- [ ] Parse sessions → segments appear in UI
- [ ] Edit segment in UI → changes persist in DB
- [ ] Approve segments → submission preview includes them
- [ ] Submit to AC → segments marked as submitted

---

## Migration Plan

### Database Changes

```bash
# Run migration
npm run migrate

# Verify new columns
npm start status
```

**Migration 014** adds:
- `review_notes` TEXT
- `reviewed_at` DATETIME
- `reviewed_by` TEXT
- `approval_status` TEXT (with CHECK constraint)

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
```

### Configuration Updates

**.env updates:**
```bash
# API Configuration
API_PORT=3001
API_HOST=localhost

# UI Configuration
VITE_API_URL=http://localhost:3001/api
```

---

## Success Criteria

### Phase 5 Complete When:

- [x] **Backend API:**
  - [ ] Express server runs on port 3001
  - [ ] All 10+ endpoints implemented and tested
  - [ ] CORS enabled for localhost:3000
  - [ ] Error handling returns clear messages
  - [ ] Database queries optimized (<200ms response)

- [x] **Frontend UI:**
  - [ ] React app runs on port 3000
  - [ ] Segment list view displays all segments
  - [ ] Filtering and search work correctly
  - [ ] Inline editing saves changes
  - [ ] Approve/Skip/Delete buttons work
  - [ ] Batch operations work
  - [ ] Dashboard shows accurate statistics
  - [ ] Submit preview matches actual submission

- [x] **User Experience:**
  - [ ] Can review 10 segments in <2 minutes
  - [ ] UI feels responsive (<100ms perceived latency)
  - [ ] Clear visual feedback on actions
  - [ ] No console errors or warnings
  - [ ] Works in Chrome/Firefox/Edge

- [x] **Data Integrity:**
  - [ ] Edits don't affect raw data (sources table immutable)
  - [ ] Approval status updates persist correctly
  - [ ] Submission preview matches what would be sent to AC
  - [ ] Browser refresh doesn't lose pending changes

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

**Implementation:** 8-12 hours
- Backend API: 3-4 hours
- Frontend setup: 2-3 hours
- Component development: 3-4 hours
- Testing & refinement: 1-2 hours

**Breakdown:**
- Migration & DB setup: 30 min
- Express API routes: 2 hours
- React app scaffolding: 1 hour
- SegmentList component: 1.5 hours
- SegmentCard component: 1 hour
- Dashboard component: 1 hour
- FilterBar & BatchActions: 1 hour
- API client hooks: 1 hour
- Styling with Tailwind: 1.5 hours
- Testing & bug fixes: 1.5 hours

---

## Status

- [ ] Documented
- [ ] Reviewed (AI) - OPTIONAL
- [ ] Implemented
- [ ] Tested
- [ ] Consulted (AI) - OPTIONAL
- [ ] Approved
- [ ] Released & Tagged

---

## Completion

**Completed:** TBD
**Tag:** `v0.5.0-phase5`
**Deviations:** TBD
**Lessons Learned:** TBD

---

## Next Steps After Phase 5

1. **Use the UI for daily reviews** - Replace script-based workflow
2. **Consider Phase 6** - If batch processing becomes tedious
3. **Consider Phase 3B** - If attribution accuracy drops below 80%
4. **Polish (Phase 7)** - When ready for long-term maintenance

---

## References

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- Smart Work Tracker Development Framework: `docs/00-DEVELOPMENT-FRAMEWORK.md`
