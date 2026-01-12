-- Migration 014 Down: Remove review fields and indexes
-- Phase 5: Review Interface
-- Date: 2026-01-11

-- Drop indexes
DROP INDEX IF EXISTS idx_segments_approval_status;
DROP INDEX IF EXISTS idx_segments_project_id;
DROP INDEX IF EXISTS idx_segments_start_time;
DROP INDEX IF EXISTS idx_segments_submitted;
DROP INDEX IF EXISTS idx_segments_status_project;

-- Note: SQLite doesn't support DROP COLUMN directly
-- To fully rollback, would need to recreate table without these columns
-- For now, indexes are dropped which is the main performance change
