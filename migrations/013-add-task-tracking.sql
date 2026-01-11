-- Add ActiveCollab task tracking field to segments table

ALTER TABLE segments ADD COLUMN ac_task_id INTEGER;
