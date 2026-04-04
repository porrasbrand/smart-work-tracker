#!/usr/bin/env node
/**
 * Update ActiveCollab time record dates to today
 */
const axios = require('axios');

const AC_API_URL = 'https://app.activecollab.com/195695/api/v1';
const AC_API_TOKEN = '124-Wcdvh4VfjbqTdGhLLeNcm73w90OdlhKSVBjmfGyy8c44bd5f5fe9b3e59f81fa6ea2a';
const TODAY = '2026-01-13';

const timeRecords = [
  { id: 110722, project: '1stchoiceproservices.com', hours: 3.50 },
  { id: 110729, project: 'BreakThrough3x.com', hours: 2.00 },
  { id: 110736, project: 'Gshomeservices', hours: 2.50 },
  { id: 110743, project: 'legendaryservice.com', hours: 2.50 },
  { id: 110750, project: 'northernservicestoday.com', hours: 3.00 }
];

async function updateTimeRecord(timeRecordId) {
  try {
    // Try editing the time record
    const response = await axios.put(
      `${AC_API_URL}/time-records/${timeRecordId}/edit`,
      {
        record_date: TODAY
      },
      {
        headers: {
          'X-Angie-AuthApiToken': AC_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true };
  } catch (err) {
    // Try without /edit
    try {
      const response = await axios.put(
        `${AC_API_URL}/time-records/${timeRecordId}`,
        {
          record_date: TODAY
        },
        {
          headers: {
            'X-Angie-AuthApiToken': AC_API_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true };
    } catch (err2) {
      return {
        success: false,
        error: err2.response?.data?.message || err2.message
      };
    }
  }
}

async function main() {
  console.log(`Updating ActiveCollab time records to ${TODAY}\n`);

  for (const record of timeRecords) {
    const result = await updateTimeRecord(record.id);

    if (result.success) {
      console.log(`✅ Time Record ${record.id}: ${record.project} (${record.hours}h) → ${TODAY}`);
    } else {
      console.log(`❌ Time Record ${record.id}: ${record.project} (${record.hours}h) - ${result.error}`);
    }
  }

  console.log('\n✅ ActiveCollab update complete');
}

main();
