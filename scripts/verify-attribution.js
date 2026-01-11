#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function verify() {
  const db = new Database(config.database.path);
  await db.connect();

  const result = await db.get(`
    SELECT
      s.id,
      s.cwd,
      s.status,
      s.project_id_detected,
      s.project_id_final,
      s.confidence_score,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.id = 1
  `);

  console.log('\n=== Segment 1 Attribution ===');
  console.log(JSON.stringify(result, null, 2));

  await db.close();
}

verify().catch(console.error);
