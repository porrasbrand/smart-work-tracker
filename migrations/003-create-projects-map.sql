CREATE TABLE projects_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activecollab_project_id INTEGER NOT NULL,
  activecollab_project_name TEXT NOT NULL,
  keywords TEXT,
  cwd_patterns TEXT,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
