#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function showWork() {
  const db = new Database(config.database.path);
  await db.connect();

  // Get segments from last 2 days
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const results = await db.all(`
    SELECT
      s.id,
      s.start_time,
      s.duration_minutes,
      s.task_description,
      s.confidence_score,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.start_time >= ?
    ORDER BY s.start_time DESC
  `, [twoDaysAgo]);

  console.log('\n=== Work Sessions (Last 2 Days) ===\n');

  let totalMinutes = 0;
  const projectSummary = {};

  results.forEach(r => {
    const date = new Date(r.start_time).toLocaleString();
    const hours = Math.floor(r.duration_minutes / 60);
    const mins = r.duration_minutes % 60;

    console.log(`[${date}] ${hours}h ${mins}m`);
    console.log(`  Project: ${r.activecollab_project_name || 'Unknown'} (AC ID: ${r.activecollab_project_id || 'N/A'})`);
    console.log(`  Task: ${r.task_description || '[No description]'}`);
    console.log(`  Confidence: ${r.confidence_score?.toFixed(2) || 'N/A'}\n`);

    totalMinutes += r.duration_minutes;

    // Aggregate by project
    const projectKey = r.activecollab_project_name || 'Unknown';
    if (!projectSummary[projectKey]) {
      projectSummary[projectKey] = {
        acId: r.activecollab_project_id,
        minutes: 0,
        segments: 0
      };
    }
    projectSummary[projectKey].minutes += r.duration_minutes;
    projectSummary[projectKey].segments++;
  });

  console.log('\n=== Summary by Project ===\n');

  Object.keys(projectSummary).sort((a, b) =>
    projectSummary[b].minutes - projectSummary[a].minutes
  ).forEach(projectName => {
    const proj = projectSummary[projectName];
    const hours = Math.floor(proj.minutes / 60);
    const mins = proj.minutes % 60;
    console.log(`${projectName} (AC ID: ${proj.acId || 'N/A'})`);
    console.log(`  Time: ${hours}h ${mins}m across ${proj.segments} work sessions\n`);
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  console.log(`Total tracked: ${totalHours}h ${totalMins}m`);

  await db.close();
}

showWork().catch(console.error);
