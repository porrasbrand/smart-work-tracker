#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showTaskContext() {
  const db = new Database(config.database.path);
  await db.connect();

  console.log('=== Segments with Task Context ===\n');

  const segments = await db.all(`
    SELECT
      s.id,
      s.start_time,
      s.duration_minutes,
      s.cwd,
      s.project_id_detected,
      s.confidence_score,
      s.task_context,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.task_context IS NOT NULL
    ORDER BY s.start_time DESC
  `);

  for (const segment of segments) {
    const date = new Date(segment.start_time);
    console.log(`[${date.toLocaleString()}] ${segment.duration_minutes}m`);
    console.log(`  Project: ${segment.activecollab_project_name || 'Unknown'}`);
    console.log(`  Confidence: ${segment.confidence_score || 'N/A'}`);
    console.log(`  CWD: ${segment.cwd}`);

    try {
      const taskContext = JSON.parse(segment.task_context);
      console.log(`  Task Context:`);
      console.log(`    Linked Tasks: ${taskContext.taskIds ? taskContext.taskIds.length : 0}`);
      if (taskContext.matchedProjects) {
        console.log(`    Matched Projects:`);
        for (const proj of taskContext.matchedProjects) {
          console.log(`      - ${proj.name} (ID: ${proj.id}, Confidence: ${proj.confidence}, Tasks: ${proj.taskCount})`);
        }
      }
      if (taskContext.taskSummaries && taskContext.taskSummaries.length > 0) {
        console.log(`    Task Summaries:`);
        taskContext.taskSummaries.slice(0, 2).forEach(summary => {
          console.log(`      - ${summary.substring(0, 100)}...`);
        });
      }
    } catch (err) {
      console.log(`  Task Context: [Parse error: ${err.message}]`);
    }
    console.log();
  }

  await db.close();
}

showTaskContext().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
