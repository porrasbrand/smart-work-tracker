#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');

async function updateTaskNames() {
  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;

  const updates = [
    {
      taskId: 138001,
      projectId: 13,
      name: 'Sales prediction system - Dynamic domain detection implementation (Part 1) (st)'
    },
    {
      taskId: 138008,
      projectId: 13,
      name: 'Sales prediction system - Domain detection fixes using Referer/Origin headers (Part 2) (st)'
    },
    {
      taskId: 138015,
      projectId: 570,
      name: 'GBP audit - Initial investigation and report generation (Part 1) (st)'
    },
    {
      taskId: 138022,
      projectId: 570,
      name: 'GBP audit - Client follow-up questions and multi-location discussion (Part 2) (st)'
    }
  ];

  console.log('=== Updating Task Names ===\n');

  for (const update of updates) {
    try {
      await axios.put(
        `${apiUrl}/api/v1/projects/${update.projectId}/tasks/${update.taskId}`,
        {
          name: update.name
        },
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✓ Updated task ${update.taskId}`);
      console.log(`  New name: ${update.name}\n`);
    } catch (err) {
      console.error(`✗ Failed to update task ${update.taskId}:`, err.response?.data?.message || err.message);
    }
  }

  console.log('✓ All task names updated!');
}

updateTaskNames().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
