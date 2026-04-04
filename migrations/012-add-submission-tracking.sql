-- Add submission tracking fields to segments table
-- SQLite requires separate ALTER TABLE statements for each column

ALTER TABLE segments ADD COLUMN submitted_to_ac INTEGER DEFAULT 0;

ALTER TABLE segments ADD COLUMN ac_time_record_id INTEGER;

ALTER TABLE segments ADD COLUMN submitted_at DATETIME;

ALTER TABLE segments ADD COLUMN submission_error TEXT;

-- Update status from 'pending' to 'ready_to_submit' for attributed segments
UPDATE segments
SET status = 'ready_to_submit'
WHERE status = 'pending'
  AND project_id_detected IS NOT NULL
  AND submitted_to_ac = 0;
