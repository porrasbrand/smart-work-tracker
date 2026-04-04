// Approve segments 333-336 and submit to ActiveCollab
const path = require('path');
const DB_PATH = '/home/mp/awesome/smart-work-tracker/data/smart-work-tracker.db';

// Load the smart-work-tracker config and modules
process.chdir('/home/mp/awesome/smart-work-tracker');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  const segmentIds = [333, 334, 335, 336];

  // Step 1: Approve all segments
  console.log('=== STEP 1: Approving segments ===\n');
  for (const id of segmentIds) {
    const result = await run(
      `UPDATE segments SET approval_status = 'approved', status = 'approved', updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    if (result.changes > 0) {
      console.log(`  ✅ Segment ${id} approved`);
    } else {
      console.log(`  ❌ Segment ${id} not found`);
    }
  }

  // Step 2: Verify they're ready
  console.log('\n=== STEP 2: Verifying ready to submit ===\n');
  const segments = await all(
    `SELECT s.id, s.duration_minutes, s.adjusted_duration_minutes, s.project_id_final, s.task_description, s.approval_status, s.submitted_to_ac,
            p.activecollab_project_name
     FROM segments s
     LEFT JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
     WHERE s.id IN (${segmentIds.join(',')})
     ORDER BY s.id`
  );

  for (const s of segments) {
    const mins = s.adjusted_duration_minutes || s.duration_minutes;
    const hours = (mins / 60).toFixed(2);
    console.log(`  [${s.id}] ${hours}h | Project: ${s.activecollab_project_name} (${s.project_id_final}) | Status: ${s.approval_status} | Submitted: ${s.submitted_to_ac || 0}`);
    console.log(`         ${s.task_description?.substring(0, 80)}...`);
  }

  // Step 3: Submit using TimeSubmitter
  console.log('\n=== STEP 3: Submitting to ActiveCollab ===\n');

  // Load config
  let config;
  try {
    config = require('./config/default.json');
  } catch (e) {
    // Try .env approach
    require('dotenv').config();
    config = {
      activeCollab: {
        apiUrl: process.env.AC_API_URL || 'https://app.activecollab.com/180377',
        apiToken: process.env.AC_API_TOKEN || '1-21MNnN4Bw0GKuZ7OV8ffjC4HXnUvm4L6hzeoFcNe',
        userId: parseInt(process.env.AC_USER_ID) || 1,
        jobTypeId: parseInt(process.env.AC_JOB_TYPE_ID) || 1,
        billableByDefault: true,
      }
    };
  }

  const TimeSubmitter = require('./src/lib/time-submitter');
  const logger = {
    info: (...args) => console.log('  [INFO]', ...args),
    error: (...args) => console.error('  [ERROR]', ...args),
    debug: () => {},
    warn: (...args) => console.warn('  [WARN]', ...args),
  };

  const submitter = new TimeSubmitter(db, logger, config);

  // Submit each segment
  for (const s of segments) {
    if (s.submitted_to_ac === 1) {
      console.log(`  SKIP segment ${s.id} — already submitted`);
      continue;
    }

    const fullSegment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM segments WHERE id = ?', [s.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    try {
      const result = await submitter.submitSegment(fullSegment);
      if (result.success) {
        console.log(`  ✅ Segment ${s.id} submitted — AC time record: ${result.timeRecordId}, task: ${result.taskId}`);
      } else {
        console.log(`  ❌ Segment ${s.id} failed: ${result.error}`);
      }
    } catch (err) {
      console.log(`  ❌ Segment ${s.id} error: ${err.message}`);
    }
  }

  // Step 4: Summary
  console.log('\n=== SUMMARY ===\n');
  const final = await all(
    `SELECT id, duration_minutes, adjusted_duration_minutes, submitted_to_ac, ac_time_record_id, ac_task_id
     FROM segments WHERE id IN (${segmentIds.join(',')}) ORDER BY id`
  );

  let totalMins = 0;
  for (const s of final) {
    const mins = s.adjusted_duration_minutes || s.duration_minutes;
    totalMins += mins;
    const status = s.submitted_to_ac ? `✅ AC record #${s.ac_time_record_id}` : '❌ not submitted';
    console.log(`  Segment ${s.id}: ${mins}m → ${status}`);
  }
  console.log(`\n  Total: ${totalMins} minutes (${(totalMins/60).toFixed(1)} hours)`);

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
});
