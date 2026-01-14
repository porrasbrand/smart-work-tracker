#!/usr/bin/env node
/**
 * Helper to create work segments for smart-work-tracker
 * Usage: node create-segment.js <duration_minutes> <project_id> <description>
 *
 * Creates segments with 'pending' status for review before approval
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Parse command line args
const [durationMinutes, projectId, description] = process.argv.slice(2);

if (!durationMinutes || !projectId || !description) {
  console.error('Usage: node create-segment.js <duration_minutes> <project_id> <description>');
  console.error('\nExample:');
  console.error('  node create-segment.js 90 570 "Created landing pages for client"');
  console.error('\nCommon Project IDs:');
  console.error('  570 - Empower Solar/Homes');
  console.error('  493 - echelonelectricnj.com');
  console.error('  401 - 1stchoiceproservices.com');
  process.exit(1);
}

const dbPath = path.join(__dirname, 'data/smart-work-tracker.db');
const db = new sqlite3.Database(dbPath);

// Get the latest source_id
db.get('SELECT MAX(source_id) as max_id FROM segments', (err, row) => {
  if (err) {
    console.error('Error getting max source_id:', err);
    process.exit(1);
  }

  const newSourceId = (row.max_id || 0) + 1;

  // Calculate timestamps
  const now = new Date();
  const startTime = new Date(now.getTime() - parseInt(durationMinutes, 10) * 60 * 1000);

  const startTimeStr = startTime.toISOString().replace('T', ' ').substring(0, 19);
  const endTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);

  const cwd = '/home/mp/awesome/super-agent';

  const taskContext = JSON.stringify({
    taskSummaries: [description],
    source: 'manual-creation'
  });

  // Create segment with PENDING status (not auto-approved)
  db.run(`
    INSERT INTO segments (
      source_id, start_time, end_time, duration_minutes, cwd,
      task_description, task_context, project_id_final,
      confidence_score, approval_status, status, submitted_to_ac,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, 'pending', 'active', 0,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    newSourceId,
    startTimeStr,
    endTimeStr,
    parseInt(durationMinutes, 10),
    cwd,
    description,
    taskContext,
    parseInt(projectId, 10)
  ], function(err) {
    if (err) {
      console.error('Error inserting segment:', err);
      process.exit(1);
    }

    console.log(`✅ Work segment created successfully!`);
    console.log(`   Segment ID: ${this.lastID}`);
    console.log(`   Source ID: ${newSourceId}`);
    console.log(`   Duration: ${durationMinutes} minutes`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Status: pending (ready for review)`);
    console.log(`   Task: ${description}`);
    console.log(`\n📊 Review and edit at: http://localhost:3000/`);
    console.log(`   - Edit duration if needed`);
    console.log(`   - Click "Approve" when ready`);

    db.close();
  });
});
