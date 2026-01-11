-- Add UNIQUE constraint on activecollab_project_id
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we need to recreate the table

-- Create new table with UNIQUE constraint
CREATE TABLE projects_map_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activecollab_project_id INTEGER NOT NULL UNIQUE,
  activecollab_project_name TEXT NOT NULL,
  keywords TEXT,
  cwd_patterns TEXT,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO projects_map_new
SELECT * FROM projects_map;

-- Drop old table
DROP TABLE projects_map;

-- Rename new table
ALTER TABLE projects_map_new RENAME TO projects_map;
