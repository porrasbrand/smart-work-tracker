#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');

async function verifyActiveCollabTime() {
  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;

  console.log('=== Verifying Time Records in ActiveCollab ===\n');

  const tasks = [
    { taskId: 138001, projectId: 13, name: 'BreakThrough3x - Part 1' },
    { taskId: 138008, projectId: 13, name: 'BreakThrough3x - Part 2' },
    { taskId: 138015, projectId: 570, name: 'Empower - Part 1' },
    { taskId: 138022, projectId: 570, name: 'Empower - Part 2' }
  ];

  const timeRecords = [
    { recordId: 110638, projectId: 13, expectedTask: 138001, hours: 0.5 },
    { recordId: 110645, projectId: 13, expectedTask: 138008, hours: 1.5 },
    { recordId: 110652, projectId: 570, expectedTask: 138015, hours: 0.5 },
    { recordId: 110659, projectId: 570, expectedTask: 138022, hours: 0.5 }
  ];

  console.log('--- Checking Tasks ---\n');

  for (const task of tasks) {
    try {
      const response = await axios.get(
        `${apiUrl}/api/v1/projects/${task.projectId}/tasks/${task.taskId}`,
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken
          }
        }
      );

      const taskData = response.data.single;
      console.log(`✓ Task ${task.taskId}: ${task.name}`);
      console.log(`  Name: ${taskData.name}`);
      console.log(`  Total Time: ${taskData.total_time || 0} seconds`);
      console.log(`  Total Hours: ${((taskData.total_time || 0) / 3600).toFixed(2)}h`);
      console.log();

    } catch (err) {
      console.error(`✗ Failed to get task ${task.taskId}:`, err.response?.data?.message || err.message);
      console.log();
    }
  }

  console.log('\n--- Checking Time Records ---\n');

  for (const record of timeRecords) {
    try {
      const response = await axios.get(
        `${apiUrl}/api/v1/projects/${record.projectId}/time-records/${record.recordId}`,
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken
          }
        }
      );

      const timeData = response.data.single;
      console.log(`✓ Time Record ${record.recordId}:`);
      console.log(`  Value: ${timeData.value}h (expected: ${record.hours}h)`);
      console.log(`  Parent Type: ${timeData.parent_type}`);
      console.log(`  Parent ID: ${timeData.parent_id} (expected task: ${record.expectedTask})`);
      console.log(`  Summary: ${timeData.summary}`);
      console.log();

    } catch (err) {
      console.error(`✗ Failed to get time record ${record.recordId}:`, err.response?.data?.message || err.message);
      console.log();
    }
  }
}

verifyActiveCollabTime().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
