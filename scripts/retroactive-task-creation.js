#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');
const Database = require('../src/lib/database');

async function retroactiveTaskCreation() {
  const db = new Database(config.database.path);
  await db.connect();

  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;
  const userId = config.activeCollab.userId;

  console.log('=== Retroactive Task Creation for Submitted Time Records ===\n');

  // Get all submitted segments without tasks
  const segments = await db.all(`
    SELECT
      s.*,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.submitted_to_ac = 1
      AND s.ac_task_id IS NULL
    ORDER BY s.start_time
  `);

  console.log(`Found ${segments.length} submitted time records without tasks\n`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const segment of segments) {
    // Build task summary
    let summary = segment.task_description || 'Development work';

    if (segment.task_context) {
      try {
        const taskContext = JSON.parse(segment.task_context);
        if (taskContext.taskSummaries && taskContext.taskSummaries.length > 0) {
          summary = taskContext.taskSummaries[0].substring(0, 250);
        }
      } catch (err) {
        // ignore
      }
    }

    const taskName = `${summary.substring(0, 100)} (st)`;

    try {
      // 1. Create task in ActiveCollab
      const taskResponse = await axios.post(
        `${apiUrl}/api/v1/projects/${segment.activecollab_project_id}/tasks`,
        {
          name: taskName,
          assignee_id: userId
        },
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const task = taskResponse.data.single;
      created++;

      console.log(`✓ Created task ${task.id}: "${task.name}"`);
      console.log(`  Project: ${segment.activecollab_project_name}`);

      // 2. Update the time record to associate with task
      await axios.put(
        `${apiUrl}/api/v1/projects/${segment.activecollab_project_id}/time-records/${segment.ac_time_record_id}`,
        {
          task_id: task.id
        },
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`  ✓ Moved time record ${segment.ac_time_record_id} to task\n`);
      updated++;

      // 3. Update database
      await db.run(`
        UPDATE segments
        SET ac_task_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [task.id, segment.id]);

    } catch (err) {
      failed++;
      console.error(`✗ Failed for segment ${segment.id}:`, err.response?.data?.message || err.message);
      console.log();
    }
  }

  await db.close();

  console.log('\n=== Summary ===');
  console.log(`Tasks created: ${created}`);
  console.log(`Time records updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

retroactiveTaskCreation().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
