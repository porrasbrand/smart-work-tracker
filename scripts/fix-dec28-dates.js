#!/usr/bin/env node
/**
 * Fix Dec 28, 2025 segments - change dates to today (Jan 13, 2026)
 * Updates both local database and ActiveCollab time records
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const dbPath = path.join(__dirname, '../data/smart-work-tracker.db');
const db = new sqlite3.Database(dbPath);

const AC_API_URL = 'https://app.activecollab.com/195695/api/v1';
const AC_API_TOKEN = '124-Wcdvh4VfjbqTdGhLLeNcm73w90OdlhKSVBjmfGyy8c44bd5f5fe9b3e59f81fa6ea2a';

const TODAY = '2026-01-13';

async function updateActiveCollabTimeRecord(timeRecordId, newDate) {
  try {
    const response = await axios.put(
      `${AC_API_URL}/time-records/${timeRecordId}`,
      {
        record_date: newDate
      },
      {
        headers: {
          'X-Angie-AuthApiToken': AC_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, data: response.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message
    };
  }
}

async function main() {
  console.log(`Fixing Dec 28, 2025 segments → ${TODAY}\n`);

  // Get segments to fix
  db.all(`
    SELECT
      s.id,
      s.project_id_final,
      s.ac_time_record_id,
      s.start_time,
      s.duration_minutes,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
    WHERE DATE(s.start_time) = '2025-12-28'
      AND s.submitted_at IS NOT NULL
    ORDER BY s.id
  `, async (err, segments) => {
    if (err) {
      console.error('❌ Error querying:', err);
      db.close();
      process.exit(1);
    }

    if (segments.length === 0) {
      console.log('No segments found for Dec 28, 2025');
      db.close();
      return;
    }

    console.log(`Found ${segments.length} segments to update:\n`);

    for (const seg of segments) {
      const hours = (seg.duration_minutes / 60).toFixed(2);
      console.log(`ID ${seg.id}: ${seg.activecollab_project_name || seg.project_id_final} (${hours}h) - AC Time Record: ${seg.ac_time_record_id}`);
    }

    console.log('\n📅 Updating dates...\n');

    // Update each segment
    for (const seg of segments) {
      const hours = (seg.duration_minutes / 60).toFixed(2);
      const projectName = (seg.activecollab_project_name || seg.project_id_final).substring(0, 20);

      // Update local database
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE segments
          SET start_time = datetime(start_time, '+16 days'),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [seg.id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Update ActiveCollab
      const acResult = await updateActiveCollabTimeRecord(seg.ac_time_record_id, TODAY);

      if (acResult.success) {
        console.log(`✅ ID ${seg.id}: ${projectName} (${hours}h) - Updated to ${TODAY}`);
      } else {
        console.log(`❌ ID ${seg.id}: ${projectName} (${hours}h) - Local updated, AC failed: ${acResult.error}`);
      }
    }

    console.log('\n✅ Date updates complete');
    db.close();
  });
}

main();
