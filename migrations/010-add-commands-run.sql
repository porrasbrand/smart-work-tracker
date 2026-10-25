-- Add commands_run column to segments table for task detection

ALTER TABLE segments ADD COLUMN commands_run TEXT;
