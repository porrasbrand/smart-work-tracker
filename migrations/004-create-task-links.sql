CREATE TABLE task_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  activecollab_task_id INTEGER,
  activecollab_task_name TEXT,
  is_new_task BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (segment_id) REFERENCES segments(id)
);
