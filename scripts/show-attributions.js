#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function show() {
  const db = new Database(config.database.path);
  await db.connect();

  const results = await db.all(`
    SELECT
      s.id,
      s.cwd,
      s.duration_minutes,
      s.confidence_score,
      p.activecollab_project_id,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    ORDER BY s.id
  `);

  console.log('\n=== Attribution Results ===\n');
  results.forEach(r => {
    const hours = Math.floor(r.duration_minutes / 60);
    const mins = r.duration_minutes % 60;
    console.log(`Segment ${r.id}: ${hours}h ${mins}m → ${r.activecollab_project_name} (AC ID ${r.activecollab_project_id}) [confidence: ${r.confidence_score}]`);
  });

  // Summary by project
  const summary = await db.all(`
    SELECT
      p.activecollab_project_name,
      p.activecollab_project_id,
      COUNT(s.id) as segment_count,
      SUM(s.duration_minutes) as total_minutes
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.project_id_detected IS NOT NULL
    GROUP BY p.id
    ORDER BY total_minutes DESC
  `);

  console.log('\n=== Time by Project ===\n');
  summary.forEach(r => {
    const hours = Math.floor(r.total_minutes / 60);
    const mins = r.total_minutes % 60;
    console.log(`${r.activecollab_project_name} (AC ID ${r.activecollab_project_id}): ${hours}h ${mins}m (${r.segment_count} segments)`);
  });

  await db.close();
}

show().catch(console.error);
