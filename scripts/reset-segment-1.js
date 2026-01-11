#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function reset() {
  const db = new Database(config.database.path);
  await db.connect();

  await db.run(`
    UPDATE segments
    SET project_id_detected = NULL,
        confidence_score = NULL
    WHERE id = 1
  `);

  console.log('✓ Reset segment 1 attribution');

  await db.close();
}

reset().catch(console.error);
