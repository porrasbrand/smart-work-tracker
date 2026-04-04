#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/smart-work-tracker.db'));

db.all(`
  SELECT
    s.*,
    p.activecollab_project_name as project_name
  FROM segments s
  LEFT JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
  WHERE DATE(s.start_time) = '2025-12-28'
  ORDER BY s.id
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log('\nDec 28, 2025 Segments:');
  console.log('─'.repeat(100));
  console.log('ID    | Project         | Hours  | Status   | Submitted | Task');
  console.log('─'.repeat(100));

  rows.forEach(row => {
    const originalHours = (row.duration_minutes / 60).toFixed(2);
    const submitted = row.submitted_at ? 'YES' : 'NO';
    const task = (row.task_description || '').substring(0, 35);
    const projectName = (row.project_name || String(row.project_id_final)).substring(0, 15);

    console.log(`${String(row.id).padEnd(5)} | ${projectName.padEnd(15)} | ${String(originalHours).padEnd(6)} | ${String(row.approval_status).padEnd(8)} | ${submitted.padEnd(9)} | ${task}`);
  });

  console.log('─'.repeat(100));
  console.log(`Total: ${rows.length} segments`);

  // Summary by status
  const byStatus = {};
  rows.forEach(r => {
    byStatus[r.approval_status] = (byStatus[r.approval_status] || 0) + 1;
  });
  console.log('\nBy Status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  db.close();
});
