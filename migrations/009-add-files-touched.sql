-- Add files_touched column to segments table for task detection

ALTER TABLE segments ADD COLUMN files_touched TEXT;
