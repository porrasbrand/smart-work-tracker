-- Add task_context field to segments table for task log integration

ALTER TABLE segments ADD COLUMN task_context TEXT;
