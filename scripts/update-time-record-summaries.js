#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');
const Database = require('../src/lib/database');

async function updateTimeRecordSummaries() {
  const db = new Database(config.database.path);
  await db.connect();

  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;

  // Define better descriptions for each segment
  const updates = [
    {
      segmentId: 6,
      acRecordId: 110638,
      project: 'BreakThrough3x.com',
      summary: 'Sales prediction system - Dynamic domain detection implementation (Part 1)'
    },
    {
      segmentId: 7,
      acRecordId: 110645,
      project: 'BreakThrough3x.com',
      summary: 'Sales prediction system - Domain detection fixes using Referer/Origin headers (Part 2)'
    },
    {
      segmentId: 8,
      acRecordId: 110652,
      project: 'Empower Solar/Homes',
      summary: 'GBP audit - Initial investigation and report generation (Part 1)'
    },
    {
      segmentId: 2,
      acRecordId: 110659,
      project: 'Empower Solar/Homes',
      summary: 'GBP audit - Client follow-up questions and multi-location discussion (Part 2)'
    }
  ];

  console.log('=== Updating Time Record Summaries in ActiveCollab ===\n');

  for (const update of updates) {
    try {
      // Get the segment to find the project ID
      const segment = await db.get(`
        SELECT s.*, p.activecollab_project_id
        FROM segments s
        LEFT JOIN projects_map p ON s.project_id_detected = p.id
        WHERE s.id = ?
      `, [update.segmentId]);

      if (!segment) {
        console.log(`✗ Segment ${update.segmentId} not found`);
        continue;
      }

      // Update the time record in ActiveCollab
      const response = await axios.put(
        `${apiUrl}/api/v1/projects/${segment.activecollab_project_id}/time-records/${update.acRecordId}`,
        {
          summary: update.summary
        },
        {
          headers: {
            'X-Angie-AuthApiToken': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✓ Updated AC Record ${update.acRecordId} (${update.project})`);
      console.log(`  New summary: ${update.summary}`);
      console.log();

    } catch (err) {
      console.error(`✗ Failed to update AC Record ${update.acRecordId}:`, err.response?.data?.message || err.message);
      console.log();
    }
  }

  await db.close();
  console.log('✓ All summaries updated!');
}

updateTimeRecordSummaries().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
