#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showTaskNames() {
  const db = new Database(config.database.path);
  await db.connect();

  const cutoffDate = new Date('2025-12-20T00:00:00Z');

  const projectConfigs = [
    { id: 13, name: 'BreakThrough3x.com' },
    { id: 570, name: 'Empower Solar/Homes' },
    { id: 1, name: 'Phoenix & Infiniskin' },
    { id: 493, name: 'echelonelectricnj.com' },
    { id: 138, name: 'northernservicestoday.com' },
    { id: 521, name: 'pearcehvac.com' }
  ];

  for (const proj of projectConfigs) {
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
    `, [cutoffDate.toISOString(), proj.id]);

    if (segments.length === 0) continue;

    console.log(`\n${'='.repeat(100)}`);
    console.log(`📁 ${proj.name}`);
    console.log(`${'='.repeat(100)}\n`);

    let totalRounded = 0;

    for (const seg of segments) {
      const date = new Date(seg.start_time);
      const adjustedMins = seg.adjusted_duration_minutes || seg.duration_minutes;
      const adjustedHours = (adjustedMins / 60).toFixed(2);
      totalRounded += adjustedMins;

      // Build task name exactly as it would be submitted
      let taskName = seg.task_description || 'Development work';
      if (seg.task_context) {
        try {
          const tc = JSON.parse(seg.task_context);
          if (tc.taskSummaries && tc.taskSummaries.length > 0) {
            taskName = tc.taskSummaries[0];
          }
        } catch (err) {}
      }

      const alreadySubmitted = seg.submitted_to_ac === 1;
      const status = alreadySubmitted ? '✅ SUBMITTED' : '📋 READY';

      console.log(`${status} | ${adjustedHours}h | ${date.toLocaleDateString()}`);
      console.log(`   ${taskName} (st)`);
      console.log();
    }

    const totalHours = (totalRounded / 60).toFixed(2);
    console.log(`📊 TOTAL: ${segments.length} tasks = ${totalHours} hours\n`);
  }

  await db.close();
}

showTaskNames().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
