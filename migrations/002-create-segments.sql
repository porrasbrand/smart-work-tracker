CREATE TABLE segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  adjusted_duration_minutes INTEGER,
  cwd TEXT,
  git_branch TEXT,
  project_id_detected INTEGER,
  project_id_final INTEGER,
  confidence_score REAL,
  task_description TEXT,
  work_summary TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
