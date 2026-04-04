#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function verifyPhoenixTasks() {
  const db = new Database(config.database.path);
  await db.connect();

  const segments = await db.all(`
    SELECT
      s.id,
      s.start_time,
      s.task_context,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE p.activecollab_project_name LIKE '%phoenix%'
    ORDER BY s.start_time DESC
  `);

  console.log('=== Phoenix-attributed Segments ===\n');

  for (const segment of segments) {
    console.log(`Segment ID: ${segment.id}`);
    console.log(`Project: ${segment.activecollab_project_name}`);
    console.log(`Time: ${new Date(segment.start_time).toLocaleString()}`);

    if (segment.task_context) {
      const taskContext = JSON.parse(segment.task_context);
      console.log(`\nTask IDs: ${taskContext.taskIds.join(', ')}`);

      // Read the actual task files
      const fs = require('fs');
      const path = require('path');

      for (const taskId of taskContext.taskIds) {
        const taskFile = `/home/mp/awesome/super-agent/tasks/responses/archive/${taskId}.json`;
        try {
          const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
          const taskText = `${taskData.task} ${taskData.response}`.toLowerCase();

          console.log(`\nTask ${taskId}:`);
          console.log(`  Contains "phoenixweightloss": ${taskText.includes('phoenixweightloss')}`);
          console.log(`  Contains "phoenix" (alone): ${taskText.includes('phoenix') && !taskText.includes('phoenixweightloss')}`);
          console.log(`  Contains "infiniskin": ${taskText.includes('infiniskin')}`);
          console.log(`  Task preview: ${taskData.task.substring(0, 150)}...`);
        } catch (err) {
          console.log(`  Error reading task: ${err.message}`);
        }
      }
    }
    console.log('\n---\n');
  }

  await db.close();
}

verifyPhoenixTasks().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
