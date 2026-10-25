-- Migration 014: Add review fields and indexes
-- Phase 5: Review Interface
-- Date: 2026-01-11

-- Add review workflow fields
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

-- Composite index for common query pattern (status + project filtering)
CREATE INDEX IF NOT EXISTS idx_segments_status_project
  ON segments(approval_status, project_id_detected);
