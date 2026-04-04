#!/usr/bin/env node

const config = require('../config');
const Database = require('../src/lib/database');

async function showDurationComparison() {
  const db = new Database(config.database.path);
  await db.connect();

  const segments = await db.all(`
    SELECT
      s.id,
      s.start_time,
      s.duration_minutes,
      s.adjusted_duration_minutes,
      p.activecollab_project_name
    FROM segments s
    LEFT JOIN projects_map p ON s.project_id_detected = p.id
    WHERE s.status != 'archived'
      AND s.adjusted_duration_minutes IS NOT NULL
    ORDER BY s.start_time DESC
  `);

  console.log('=== Duration Adjustment Comparison ===\n');
  console.log('Strategy: Round up to nearest 30 minutes with 30-minute minimum\n');

  let totalOriginal = 0;
  let totalAdjusted = 0;

  for (const segment of segments) {
    const date = new Date(segment.start_time);
    const originalHours = (segment.duration_minutes / 60).toFixed(2);
    const adjustedHours = (segment.adjusted_duration_minutes / 60).toFixed(2);
    const diffMinutes = segment.adjusted_duration_minutes - segment.duration_minutes;
    const diffHours = (diffMinutes / 60).toFixed(2);

    console.log(`[${date.toLocaleDateString()}] ${segment.activecollab_project_name || 'Unknown'}`);
    console.log(`  Original:  ${originalHours}h (${segment.duration_minutes}m)`);
    console.log(`  Adjusted:  ${adjustedHours}h (${segment.adjusted_duration_minutes}m)`);
    console.log(`  Difference: +${diffHours}h (+${diffMinutes}m)`);
    console.log();

    totalOriginal += segment.duration_minutes;
    totalAdjusted += segment.adjusted_duration_minutes;
  }

  const totalDiff = totalAdjusted - totalOriginal;
  const percentIncrease = ((totalDiff / totalOriginal) * 100).toFixed(1);

  console.log('\n=== Total Summary ===\n');
  console.log(`Original total:  ${(totalOriginal / 60).toFixed(2)}h`);
  console.log(`Adjusted total:  ${(totalAdjusted / 60).toFixed(2)}h`);
  console.log(`Total difference: +${(totalDiff / 60).toFixed(2)}h (+${percentIncrease}%)`);

  await db.close();
}

showDurationComparison().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
