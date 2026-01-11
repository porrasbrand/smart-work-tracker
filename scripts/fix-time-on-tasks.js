#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');
const Database = require('../src/lib/database');

async function fixTimeOnTasks() {
  const db = new Database(config.database.path);
  await db.connect();

  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;

  console.log('=== Moving Time Records to Tasks ===\n');

  // Get all segments with both time record ID and task ID
  const segments = await db.all(`
    SELECT
      s.*,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.ac_time_record_id IS NOT NULL
      AND s.ac_task_id IS NOT NULL
    ORDER BY s.start_time
  `);

  console.log(`Found ${segments.length} time records to move to tasks\n`);

  let updated = 0;
  let failed = 0;

  for (const segment of segments) {
    try {
      // Update the time record to link it to the task
      await axios.put(
        `${apiUrl}/api/v1/projects/${segment.activecollab_project_id}/time-records/${segment.ac_time_record_id}`,
        {
          task_id: segment.ac_task_id
        },
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✓ Moved time record ${segment.ac_time_record_id} to task ${segment.ac_task_id}`);
      console.log(`  Project: ${segment.activecollab_project_name}`);
      console.log(`  Duration: ${(segment.adjusted_duration_minutes || segment.duration_minutes) / 60}h\n`);

      updated++;

    } catch (err) {
      failed++;
      console.error(`✗ Failed to move time record ${segment.ac_time_record_id}:`, err.response?.data?.message || err.message);
      console.log();
    }
  }

  await db.close();

  console.log('\n=== Summary ===');
  console.log(`Time records moved: ${updated}`);
  console.log(`Failed: ${failed}`);
}

fixTimeOnTasks().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
