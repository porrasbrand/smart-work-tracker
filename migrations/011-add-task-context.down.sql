-- Remove task_context column (requires table recreation in SQLite)

CREATE TABLE segments_temp (
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
  files_touched TEXT,
  commands_run TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

INSERT INTO segments_temp
SELECT
  id, source_id, start_time, end_time, duration_minutes,
  adjusted_duration_minutes, cwd, git_branch, project_id_detected,
  project_id_final, confidence_score, task_description, work_summary,
  status, created_at, updated_at, files_touched, commands_run
FROM segments;

DROP TABLE segments;

ALTER TABLE segments_temp RENAME TO segments;
