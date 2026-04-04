#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function clear() {
  const db = new Database(config.database.path);
  await db.connect();

  // Delete all segments and sources to re-parse
  await db.run('DELETE FROM segments');
  await db.run('DELETE FROM sources');

  console.log('✓ Cleared all segments and sources');

  await db.close();
}

clear().catch(console.error);
