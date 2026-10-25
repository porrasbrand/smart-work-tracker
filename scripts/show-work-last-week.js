#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showWorkLastWeek() {
  const db = new Database(config.database.path);
  await db.connect();

  // Calculate date 7 days ago
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const segments = await db.all(`
    SELECT
      s.id,
      s.start_time,
      s.end_time,
      s.duration_minutes,
      s.cwd,
      s.task_description,
      s.confidence_score,
      s.files_touched,
      s.commands_run,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.status = 'pending'
      AND datetime(s.start_time) >= datetime(?)
    ORDER BY s.start_time DESC
  `, [weekAgo.toISOString()]);

  console.log('=== Work Sessions (Last 7 Days) ===\n');

  for (const segment of segments) {
    const date = new Date(segment.start_time);
    const hours = Math.floor(segment.duration_minutes / 60);
    const mins = segment.duration_minutes % 60;

    console.log(`[${date.toLocaleString()}] ${hours}h ${mins}m`);
    console.log(`  Project: ${segment.activecollab_project_name || 'Unknown'} (AC ID: ${segment.activecollab_project_id || 'N/A'})`);
    console.log(`  Task: ${segment.task_description || '[No description]'}`);
    console.log(`  Confidence: ${segment.confidence_score || 'N/A'}`);
    console.log();
  }

  // Summary by project
  const projectSummary = {};

  for (const segment of segments) {
    const projectName = segment.activecollab_project_name || 'Unknown';
    const acId = segment.activecollab_project_id || 'N/A';
    const key = `${projectName} (AC ID: ${acId})`;

    if (!projectSummary[key]) {
      projectSummary[key] = {
        totalMinutes: 0,
        sessionCount: 0
      };
    }

    projectSummary[key].totalMinutes += segment.duration_minutes;
    projectSummary[key].sessionCount++;
  }

  console.log('\n=== Summary by Project (Last 7 Days) ===\n');

  const sorted = Object.entries(projectSummary).sort((a, b) => b[1].totalMinutes - a[1].totalMinutes);

  let totalMinutes = 0;
  for (const [projectName, data] of sorted) {
    const hours = Math.floor(data.totalMinutes / 60);
    const mins = data.totalMinutes % 60;
    console.log(`${projectName}`);
    console.log(`  Time: ${hours}h ${mins}m across ${data.sessionCount} work sessions`);
    console.log();
    totalMinutes += data.totalMinutes;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  console.log(`Total tracked: ${totalHours}h ${totalMins}m`);

  await db.close();
}

showWorkLastWeek().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
