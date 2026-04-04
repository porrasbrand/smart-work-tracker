#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function previewSubmissionSinceDate() {
  const db = new Database(config.database.path);
  await db.connect();

  // December 20, 2025
  const cutoffDate = new Date('2025-12-20T00:00:00Z');

  console.log('=== Work Summary Preview (Since Dec 20, 2025) ===\n');
  console.log(`Cutoff Date: ${cutoffDate.toLocaleDateString()}\n`);
  console.log('⚠️  DRY RUN - Nothing will be submitted\n');
  console.log('─'.repeat(80));

  // Get all segments since cutoff that are attributed
  const segments = await db.all(`
    SELECT
      s.*,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE datetime(s.start_time) >= datetime(?)
      AND s.status != 'archived'
    ORDER BY s.start_time DESC
  `, [cutoffDate.toISOString()]);

  console.log(`\nFound ${segments.length} work segments since Dec 20\n`);
  console.log('─'.repeat(80));

  // Group by project
  const projectGroups = {};
  let totalOriginalMinutes = 0;
  let totalAdjustedMinutes = 0;
  let submittableCount = 0;
  let unattributedCount = 0;

  for (const seg of segments) {
    const projectName = seg.activecollab_project_name || 'Unknown/Unattributed';
    const projectId = seg.activecollab_project_id || 'N/A';
    const key = `${projectName}|||${projectId}`;

    if (!projectGroups[key]) {
      projectGroups[key] = {
        name: projectName,
        acId: projectId,
        segments: []
      };
    }

    projectGroups[key].segments.push(seg);
    totalOriginalMinutes += seg.duration_minutes;
    totalAdjustedMinutes += (seg.adjusted_duration_minutes || seg.duration_minutes);

    if (seg.activecollab_project_id) {
      submittableCount++;
    } else {
      unattributedCount++;
    }
  }

  // Display by project
  for (const key of Object.keys(projectGroups).sort()) {
    const group = projectGroups[key];

    console.log(`\n📁 PROJECT: ${group.name}`);
    if (group.acId !== 'N/A') {
      console.log(`   ActiveCollab ID: ${group.acId}`);
    }
    console.log('   ' + '─'.repeat(76));

    let projectOriginalMinutes = 0;
    let projectAdjustedMinutes = 0;

    for (const seg of group.segments) {
      const date = new Date(seg.start_time);
      const originalMins = seg.duration_minutes;
      const adjustedMins = seg.adjusted_duration_minutes || seg.duration_minutes;

      projectOriginalMinutes += originalMins;
      projectAdjustedMinutes += adjustedMins;

      // Build task name
      let taskName = seg.task_description || 'Development work';
      if (seg.task_context) {
        try {
          const tc = JSON.parse(seg.task_context);
          if (tc.taskSummaries && tc.taskSummaries.length > 0) {
            taskName = tc.taskSummaries[0].substring(0, 100);
          }
        } catch (err) {}
      }

      const originalHours = (originalMins / 60).toFixed(2);
      const adjustedHours = (adjustedMins / 60).toFixed(2);
      const alreadySubmitted = seg.submitted_to_ac === 1;

      console.log(`\n   📋 ${alreadySubmitted ? '[SUBMITTED]' : '[READY]'} ${date.toLocaleDateString()} - ${date.toLocaleTimeString()}`);
      console.log(`      Task Name: ${taskName} (st)`);
      console.log(`      Original Time: ${originalHours}h (${originalMins}m)`);
      console.log(`      Rounded Time:  ${adjustedHours}h (${adjustedMins}m)`);
      console.log(`      Confidence: ${seg.confidence_score || 'N/A'}`);

      if (alreadySubmitted) {
        console.log(`      ✅ AC Time Record ID: ${seg.ac_time_record_id}`);
        console.log(`      ✅ AC Task ID: ${seg.ac_task_id || 'N/A'}`);
      }
    }

    const projectOriginalHours = (projectOriginalMinutes / 60).toFixed(2);
    const projectAdjustedHours = (projectAdjustedMinutes / 60).toFixed(2);
    const projectDiff = ((projectAdjustedMinutes - projectOriginalMinutes) / 60).toFixed(2);

    console.log(`\n   📊 PROJECT TOTALS:`);
    console.log(`      Sessions: ${group.segments.length}`);
    console.log(`      Original: ${projectOriginalHours}h`);
    console.log(`      Rounded:  ${projectAdjustedHours}h`);
    console.log(`      Difference: +${projectDiff}h`);
  }

  // Overall summary
  const totalOriginalHours = (totalOriginalMinutes / 60).toFixed(2);
  const totalAdjustedHours = (totalAdjustedMinutes / 60).toFixed(2);
  const totalDiff = ((totalAdjustedMinutes - totalOriginalMinutes) / 60).toFixed(2);

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 OVERALL SUMMARY (Since Dec 20, 2025)');
  console.log('='.repeat(80));
  console.log(`Total Work Sessions: ${segments.length}`);
  console.log(`  - Ready to Submit: ${submittableCount}`);
  console.log(`  - Unattributed (will skip): ${unattributedCount}`);
  console.log();
  console.log(`Original Time Tracked: ${totalOriginalHours}h`);
  console.log(`Rounded Time (30min): ${totalAdjustedHours}h`);
  console.log(`Rounding Increase: +${totalDiff}h (+${((totalAdjustedMinutes - totalOriginalMinutes) / totalOriginalMinutes * 100).toFixed(1)}%)`);
  console.log();
  console.log(`Billable Amount @ $100/hr: $${(parseFloat(totalAdjustedHours) * 100).toFixed(2)}`);
  console.log('='.repeat(80));

  // Check if already submitted
  const alreadySubmitted = await db.get(`
    SELECT COUNT(*) as count
    FROM segments
    WHERE datetime(start_time) >= datetime(?)
      AND submitted_to_ac = 1
  `, [cutoffDate.toISOString()]);

  const notYetSubmitted = await db.get(`
    SELECT COUNT(*) as count
    FROM segments
    WHERE datetime(start_time) >= datetime(?)
      AND submitted_to_ac = 0
      AND project_id_detected IS NOT NULL
  `, [cutoffDate.toISOString()]);

  console.log(`\n📝 SUBMISSION STATUS:`);
  console.log(`   Already Submitted: ${alreadySubmitted.count} segments`);
  console.log(`   Ready to Submit: ${notYetSubmitted.count} segments`);
  console.log(`   Unattributed: ${unattributedCount} segments`);

  await db.close();
}

previewSubmissionSinceDate().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
