#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/smart-work-tracker.db');
const db = new sqlite3.Database(dbPath);

db.all(`
  SELECT
    s.id,
    s.start_time,
    s.duration_minutes,
    s.ac_time_record_id,
    s.ac_task_id,
    s.submitted_to_ac,
    s.submitted_at,
    p.activecollab_project_name
  FROM segments s
  LEFT JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
  WHERE s.id IN (134, 135, 136, 137, 138)
  ORDER BY s.id
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    process.exit(1);
  }

  console.log('\nSegments 134-138 ActiveCollab Info:\n');
  console.log('─'.repeat(120));
  console.log('ID  | Date       | Hours | AC Task ID | AC Time Record ID | Submitted | Project');
  console.log('─'.repeat(120));

  rows.forEach(r => {
    const hours = (r.duration_minutes / 60).toFixed(2);
    const date = r.start_time.substring(0, 10);
    const taskId = r.ac_task_id || 'NULL';
    const timeId = r.ac_time_record_id || 'NULL';
    const submitted = r.submitted_to_ac ? 'YES' : 'NO';
    const project = (r.activecollab_project_name || '').substring(0, 25);

    console.log(`${String(r.id).padEnd(3)} | ${date} | ${hours.padEnd(5)} | ${String(taskId).padEnd(10)} | ${String(timeId).padEnd(17)} | ${submitted.padEnd(9)} | ${project}`);
  });

  console.log('─'.repeat(120));
  db.close();
});
