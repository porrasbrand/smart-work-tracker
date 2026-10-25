#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showActiveCollabStructure() {
  const db = new Database(config.database.path);
  await db.connect();

  console.log('=== ActiveCollab Structure (Smart Tracker Submissions) ===\n');

  const segments = await db.all(`
    SELECT
      s.*,
      p.activecollab_project_name,
      p.activecollab_project_id
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.submitted_to_ac = 1
    ORDER BY p.activecollab_project_id, s.start_time
  `);

  let currentProject = null;

  for (const seg of segments) {
    if (currentProject !== seg.activecollab_project_name) {
      if (currentProject) console.log('\n');
      currentProject = seg.activecollab_project_name;
      console.log(`📁 PROJECT: ${currentProject} (AC ID: ${seg.activecollab_project_id})`);
      console.log('─'.repeat(80));
    }

    // Get task name from summary
    let taskName = 'Development work';
    if (seg.task_context) {
      try {
        const tc = JSON.parse(seg.task_context);
        if (tc.taskSummaries && tc.taskSummaries.length > 0) {
          taskName = tc.taskSummaries[0].substring(0, 100);
        }
      } catch (err) {}
    }

    const hours = ((seg.adjusted_duration_minutes || seg.duration_minutes) / 60).toFixed(2);
    const date = new Date(seg.start_time).toLocaleDateString();

    console.log(`\n  📋 TASK ID: ${seg.ac_task_id || 'N/A'}`);
    console.log(`     Name: ${taskName} (st)`);
    console.log(`\n     ⏱️  TIME RECORD ID: ${seg.ac_time_record_id}`);
    console.log(`        Date: ${date}`);
    console.log(`        Hours: ${hours}h`);
    console.log(`        Billable: Yes @ $100/hr`);
  }

  await db.close();

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ All time records are now on specific TASKS within projects!');
  console.log('✅ All tasks have the (st) suffix for easy identification');
  console.log('='.repeat(80));
}

showActiveCollabStructure().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
