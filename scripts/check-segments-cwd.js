#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function check() {
  const db = new Database(config.database.path);
  await db.connect();

  const segments = await db.all(`
    SELECT id, cwd, git_branch, duration_minutes
    FROM segments
    ORDER BY id
    LIMIT 10
  `);

  console.log('\n=== Segment CWD Values ===');
  segments.forEach(s => {
    console.log(`ID ${s.id}: cwd="${s.cwd}" branch="${s.git_branch}" duration=${s.duration_minutes}m`);
  });

  // Count segments with/without CWD
  const withCwd = await db.get('SELECT COUNT(*) as count FROM segments WHERE cwd IS NOT NULL');
  const withoutCwd = await db.get('SELECT COUNT(*) as count FROM segments WHERE cwd IS NULL');

  console.log(`\n✓ Segments with CWD: ${withCwd.count}`);
  console.log(`✗ Segments without CWD: ${withoutCwd.count}`);

  await db.close();
}

check().catch(console.error);
