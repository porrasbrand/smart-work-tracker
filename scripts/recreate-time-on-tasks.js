#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');
const Database = require('../src/lib/database');

async function recreateTimeOnTasks() {
  const db = new Database(config.database.path);
  await db.connect();

  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;
  const userId = config.activeCollab.userId;
  const jobTypeId = config.activeCollab.jobTypeId;

  console.log('=== Recreating Time Records on Tasks ===\n');

  // Get all segments with time records and tasks
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

  console.log(`Found ${segments.length} time records to recreate\n`);

  let deleted = 0;
  let created = 0;
  let failed = 0;

  for (const segment of segments) {
    const durationMinutes = segment.adjusted_duration_minutes || segment.duration_minutes;
    const hours = durationMinutes / 60;
    const recordDate = new Date(segment.start_time).toISOString().split('T')[0];

    // Build summary
    let summary = segment.task_description || 'Development work';
    if (segment.task_context) {
      try {
        const taskContext = JSON.parse(segment.task_context);
        if (taskContext.taskSummaries && taskContext.taskSummaries.length > 0) {
          summary = taskContext.taskSummaries[0].substring(0, 250);
        }
      } catch (err) {}
    }

    try {
      console.log(`Processing segment ${segment.id}:`);

      // 1. Delete old project-level time record
      await axios.delete(
        `${apiUrl}/api/v1/projects/${segment.activecollab_project_id}/time-records/${segment.ac_time_record_id}`,
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken
          }
        }
      );
      console.log(`  ✓ Deleted old time record ${segment.ac_time_record_id} (project-level)`);
      deleted++;

      // 2. Create new time record on task
      const response = await axios.post(
        `${apiUrl}/api/v1/projects/${segment.activecollab_project_id}/time-records`,
        {
          value: hours.toFixed(2),
          user_id: userId,
          job_type_id: jobTypeId,
          record_date: recordDate,
          billable_status: 1,
          summary: summary,
          task_id: segment.ac_task_id  // THIS is the key - puts it on the task
        },
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const newTimeRecord = response.data.single;
      console.log(`  ✓ Created new time record ${newTimeRecord.id} on task ${segment.ac_task_id}`);
      console.log(`  Duration: ${hours.toFixed(2)}h | Date: ${recordDate}`);
      created++;

      // 3. Update database with new time record ID
      await db.run(`
        UPDATE segments
        SET ac_time_record_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newTimeRecord.id, segment.id]);

      console.log();

    } catch (err) {
      failed++;
      console.error(`  ✗ Failed:`, err.response?.data?.message || err.message);
      console.log();
    }
  }

  await db.close();

  console.log('\n=== Summary ===');
  console.log(`Old records deleted: ${deleted}`);
  console.log(`New records created on tasks: ${created}`);
  console.log(`Failed: ${failed}`);
}

recreateTimeOnTasks().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
