CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  status TEXT DEFAULT 'pending'
);
