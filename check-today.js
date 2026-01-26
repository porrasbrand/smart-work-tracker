/**
 * Check today's tracked work
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./smart-work-tracker.db');

db.all(`
  SELECT
    datetime(s.start_time, 'localtime') as start,
    ROUND(COALESCE(s.adjusted_duration_minutes, s.duration_minutes), 1) as minutes,
    p.name as project_name,
    p.ac_project_id,
    s.task_description,
    SUBSTR(src.session_id, 1, 12) as session_short,
    s.approval_status,
    s.submitted_to_ac,
    s.id as segment_id
  FROM segments s
  LEFT JOIN projects p ON s.project_id_final = p.id
  LEFT JOIN sources src ON s.source_id = src.id
  WHERE DATE(s.start_time) = date('now')
  ORDER BY s.start_time DESC
  LIMIT 30
`, (e, rows) => {
  if (e) {
    console.error('Error:', e);
    process.exit(1);
  }

  console.log('\n📅 Work Tracked Today (January 26, 2026):\n');

  if (rows.length === 0) {
    console.log('❌ No work segments found for today yet.');
    console.log('\nRun: node src/index.js parse');
    db.close();
    return;
  }

  let totalMinutes = 0;
  let byProject = {};

  rows.forEach((r, i) => {
    const status = r.submitted_to_ac
      ? '✅ Billed'
      : r.approval_status === 'approved'
        ? '⏳ Approved'
        : '⏳ Pending';

    const projName = r.project_name || '❓ Unknown';

    console.log(`[${i+1}] ${r.start} | ${r.minutes}m | ${status}`);
    console.log(`    Project: ${projName}`);
    console.log(`    Task: ${r.task_description || '❓ Not detected yet'}`);
    console.log(`    ID: ${r.segment_id}`);
    console.log('');

    totalMinutes += parseFloat(r.minutes);

    // Group by project
    if (!byProject[projName]) {
      byProject[projName] = {
        minutes: 0,
        count: 0,
        billed: 0,
        pending: 0
      };
    }
    byProject[projName].minutes += parseFloat(r.minutes);
    byProject[projName].count++;
    if (r.submitted_to_ac) {
      byProject[projName].billed++;
    } else {
      byProject[projName].pending++;
    }
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 Summary by Project:\n`);

  Object.entries(byProject).forEach(([proj, data]) => {
    const hours = (data.minutes / 60).toFixed(2);
    console.log(`${proj}:`);
    console.log(`  Time: ${hours}h (${Math.round(data.minutes)}m)`);
    console.log(`  Segments: ${data.count}`);
    console.log(`  Status: ${data.billed} billed, ${data.pending} pending`);
    console.log('');
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total time today: ${(totalMinutes / 60).toFixed(2)} hours (${Math.round(totalMinutes)} minutes)`);

  const billed = rows.filter(r => r.submitted_to_ac).length;
  const pending = rows.filter(r => !r.submitted_to_ac).length;
  console.log(`Overall status: ${billed} segments billed, ${pending} pending\n`);

  db.close();
});
