#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showSubmittedBreakdown() {
  const db = new Database(config.database.path);
  await db.connect();

  const segments = await db.all(`
    SELECT
      s.*,
      p.activecollab_project_name,
      p.activecollab_project_id
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.ac_time_record_id IS NOT NULL
    ORDER BY p.activecollab_project_id, s.start_time
  `);

  console.log('=== ActiveCollab Time Records Submitted ===\n');

  let currentProject = null;

  for (const seg of segments) {
    if (currentProject !== seg.activecollab_project_name) {
      if (currentProject) console.log('\n---\n');
      currentProject = seg.activecollab_project_name;
      console.log(`PROJECT: ${currentProject} (AC ID: ${seg.activecollab_project_id})\n`);
    }

    const start = new Date(seg.start_time);
    const end = new Date(seg.end_time);
    const hours = (seg.adjusted_duration_minutes / 60).toFixed(2);

    console.log(`AC Record ID: ${seg.ac_time_record_id}`);
    console.log(`  Segment: #${seg.id} (${seg.duration_minutes}m → ${seg.adjusted_duration_minutes}m)`);
    console.log(`  Time: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);
    console.log(`  Billed: ${hours}h`);

    if (seg.task_context) {
      const tc = JSON.parse(seg.task_context);
      console.log(`  Task IDs: ${tc.taskIds.join(', ')}`);
      console.log(`  Summary: ${tc.taskSummaries[0].substring(0, 100)}...`);
    } else {
      console.log(`  Summary: ${seg.task_description || 'Development work'}`);
    }
    console.log();
  }

  await db.close();
}

showSubmittedBreakdown().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
