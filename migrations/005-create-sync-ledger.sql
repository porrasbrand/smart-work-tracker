CREATE TABLE sync_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  activecollab_project_id INTEGER NOT NULL,
  activecollab_task_id INTEGER,
  activecollab_time_record_id INTEGER,
  pushed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  push_hash TEXT,
  FOREIGN KEY (segment_id) REFERENCES segments(id),
  UNIQUE(segment_id, activecollab_project_id, activecollab_task_id)
);
