#!/usr/bin/env node
/**
 * Fix submitted segments that still have 'approved' status
 * These should be marked as 'submitted' to match their submitted_at timestamp
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/smart-work-tracker.db');
const db = new sqlite3.Database(dbPath);

console.log('Fixing submitted segment statuses...\n');

// Find segments that have been submitted but still show as 'approved'
db.all(`
  SELECT id, project_id_final, start_time, approval_status, submitted_at
  FROM segments
  WHERE submitted_at IS NOT NULL
    AND approval_status != 'submitted'
`, (err, rows) => {
  if (err) {
    console.error('Error querying:', err);
    db.close();
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('✅ No segments need fixing. All submitted segments have correct status.');
    db.close();
    return;
  }

  console.log(`Found ${rows.length} submitted segments with incorrect status:\n`);
  rows.forEach(r => {
    console.log(`  ID ${r.id}: ${r.approval_status} → submitted (project ${r.project_id_final})`);
  });

  // Update them to 'submitted' status
  db.run(`
    UPDATE segments
    SET approval_status = 'submitted',
        updated_at = CURRENT_TIMESTAMP
    WHERE submitted_at IS NOT NULL
      AND approval_status != 'submitted'
  `, function(err) {
    if (err) {
      console.error('\n❌ Error updating:', err);
      db.close();
      process.exit(1);
    }

    console.log(`\n✅ Fixed ${this.changes} segment(s)`);
    db.close();
  });
});
