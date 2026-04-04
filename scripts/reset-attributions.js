#!/usr/bin/env node

const path = require('path');
const config = require('../config');
const Database = require('../src/lib/database');

async function resetAttributions() {
  const db = new Database(config.database.path);

  await db.connect();

  console.log('Resetting all segment attributions...\n');

  const result = await db.run(`
    UPDATE segments
    SET project_id_detected = NULL,
        confidence_score = NULL,
        task_context = NULL
    WHERE status = 'pending'
  `);

  console.log(`✓ Reset ${result.changes} segments`);

  await db.close();
}

resetAttributions().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
