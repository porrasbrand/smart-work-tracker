#!/usr/bin/env node
/**
 * Manually insert December 2025 client report segments
 * Created: 2026-01-13
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const CLIENTS = [
  {
    name: '1st Choice Pro Services',
    project_id: 401,
    project_name: '1stchoiceproservices.com',
    hours: 3.5,
    date: '2025-12-28'
  },
  {
    name: 'Breakthrough3x',
    project_id: 13,
    project_name: 'BreakThrough3x.com - Dan Kuschel',
    hours: 2.0,
    date: '2025-12-28'
  },
  {
    name: 'Greener Solutions',
    project_id: 507,
    project_name: 'Gshomeservices',
    hours: 2.5,
    date: '2025-12-28'
  },
  {
    name: 'Legendary Heating',
    project_id: 416,
    project_name: 'legendaryservice.com',
    hours: 2.5,
    date: '2025-12-28'
  },
  {
    name: 'Northern Services',
    project_id: 138,
    project_name: 'northernservicestoday.com',
    hours: 3.0,
    date: '2025-12-28'
  }
];

async function insertSegments() {
  const dbPath = path.resolve(__dirname, '../data/smart-work-tracker.db');

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('📊 Inserting December 2025 client report segments...\n');

  // Create a manual source entry for these segments
  const sourceId = await db.run(`
    INSERT INTO sources (session_id, file_path, file_size, file_hash, status, created_at, processed_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    'manual-december-reports',
    '/home/mp/awesome/b3x-client-reports',
    0,
    'manual-entry',
    'parsed'
  ]);

  const insertedSourceId = sourceId.lastID;
  console.log(`✅ Created source entry: ID ${insertedSourceId}\n`);

  for (const client of CLIENTS) {
    const duration_minutes = Math.round(client.hours * 60);
    const start_time = `${client.date}T09:00:00`;
    const end_time = `${client.date}T${String(9 + Math.floor(client.hours)).padStart(2, '0')}:${String((client.hours % 1) * 60).padStart(2, '0')}:00`;

    const task_context = JSON.stringify({
      taskSummaries: [
        'Generate December 2025 Report -- New Enhanced Format',
        `Created comprehensive monthly report for ${client.name}`,
        'Integrated GA4, Google Ads, Bing Ads, and content data',
        'Published to breakthrough3x.com/apps/reports/'
      ],
      filesModified: [
        `reports/${client.project_name.split(' ')[0].toLowerCase()}-december-2025.html`,
        `reports/${client.project_name.split(' ')[0].toLowerCase()}-december-2025-detailed.html`
      ],
      commands: [
        'node scripts/automated-data-collector.js',
        'node scripts/generate-report.js'
      ]
    });

    const result = await db.run(`
      INSERT INTO segments (
        source_id,
        start_time,
        end_time,
        duration_minutes,
        project_id_final,
        confidence_score,
        task_description,
        task_context,
        approval_status,
        cwd,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      insertedSourceId,
      start_time,
      end_time,
      duration_minutes,
      client.project_id,
      1.0,
      'Generate December 2025 Report -- New Enhanced Format',
      task_context,
      'pending',
      '/home/mp/awesome/b3x-client-reports'
    ]);

    console.log(`✅ ${client.name.padEnd(30)} | ${client.hours}h | Segment ID: ${result.lastID}`);
  }

  console.log(`\n🎉 Successfully inserted ${CLIENTS.length} segments!`);
  console.log('\n📋 Next steps:');
  console.log('   1. Review segments in Smart Work Tracker UI');
  console.log('   2. Manually approve each segment');
  console.log('   3. Submit to ActiveCollab');

  await db.close();
}

insertSegments().catch(err => {
  console.error('❌ Error inserting segments:', err);
  process.exit(1);
});
