#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function previewClientProjects() {
  const db = new Database(config.database.path);
  await db.connect();

  const cutoffDate = new Date('2025-12-20T00:00:00Z');

  // Get segments for the 6 specific projects
  const projectIds = [13, 570, 1, 493, 138, 521]; // Breakthrough, Empower, Phoenix, Echelon, Northern, Pearce

  for (const projectId of projectIds) {
    const segments = await db.all(`
      SELECT
        s.*,
        p.activecollab_project_id,
        p.activecollab_project_name
      FROM segments s
      LEFT JOIN projects_map p ON s.project_id_detected = p.id
      WHERE datetime(s.start_time) >= datetime(?)
        AND s.status != 'archived'
        AND p.activecollab_project_id = ?
      ORDER BY s.start_time DESC
    `, [cutoffDate.toISOString(), projectId]);

    if (segments.length === 0) continue;

    const projectName = segments[0].activecollab_project_name;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📁 ${projectName}`);
    console.log(`   ActiveCollab ID: ${projectId}`);
    console.log(`${'='.repeat(80)}\n`);

    let totalOriginal = 0;
    let totalRounded = 0;

    for (const seg of segments) {
      const date = new Date(seg.start_time);
      const originalMins = seg.duration_minutes;
      const adjustedMins = seg.adjusted_duration_minutes || seg.duration_minutes;

      totalOriginal += originalMins;
      totalRounded += adjustedMins;

      // Build task name
      let taskName = seg.task_description || 'Development work';
      if (seg.task_context) {
        try {
          const tc = JSON.parse(seg.task_context);
          if (tc.taskSummaries && tc.taskSummaries.length > 0) {
            taskName = tc.taskSummaries[0];
          }
        } catch (err) {}
      }

      const originalHours = (originalMins / 60).toFixed(2);
      const adjustedHours = (adjustedMins / 60).toFixed(2);
      const alreadySubmitted = seg.submitted_to_ac === 1;

      console.log(`${alreadySubmitted ? '✅ [SUBMITTED]' : '📋 [READY]'} ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   ${taskName.substring(0, 100)} (st)`);
      console.log(`   Original: ${originalHours}h → Rounded: ${adjustedHours}h`);
      if (alreadySubmitted) {
        console.log(`   AC Task: ${seg.ac_task_id} | Time Record: ${seg.ac_time_record_id}`);
      }
      console.log();
    }

    const totalOriginalHours = (totalOriginal / 60).toFixed(2);
    const totalRoundedHours = (totalRounded / 60).toFixed(2);
    const diff = (totalRounded - totalOriginal) / 60;

    console.log(`📊 TOTALS: ${segments.length} sessions | ${totalOriginalHours}h → ${totalRoundedHours}h (+${diff.toFixed(2)}h)\n`);
  }

  await db.close();
}

previewClientProjects().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
