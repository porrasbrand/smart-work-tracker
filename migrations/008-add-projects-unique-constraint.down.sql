-- Revert to original projects_map table without UNIQUE constraint

CREATE TABLE projects_map_old (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activecollab_project_id INTEGER NOT NULL,
  activecollab_project_name TEXT NOT NULL,
  keywords TEXT,
  cwd_patterns TEXT,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO projects_map_old
SELECT * FROM projects_map;

DROP TABLE projects_map;

ALTER TABLE projects_map_old RENAME TO projects_map;
