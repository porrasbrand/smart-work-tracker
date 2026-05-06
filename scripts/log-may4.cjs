/**
 * Log May 4 hours: 1 hetzner-orchestration segment + 1 lipo-360 estimate segment.
 * Both attributed to B3X Internal (AC#13).
 *
 * Hetzner: 7 tasks, 50.7 min wall time (B3X Internal: registry Phase 1-4 + sortable cols + GitHub remote)
 * Lipo-360: ~3.5h estimate covering dispatching, spec writing, response review, Apache route on hassan,
 *           git audit + commits, design discussions, moral backup, etc.
 *
 * Total: ~4.4h B3X Internal for May 4.
 */
const sqlite3 = require('sqlite3').verbose();
process.chdir('/home/mp/awesome/smart-work-tracker');

const COMMIT = process.argv.includes('--commit');
const DB_PATH = '/home/mp/awesome/smart-work-tracker/data/smart-work-tracker.db';
const db = new sqlite3.Database(DB_PATH);
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(e){ e ? rej(e) : res({changes: this.changes, lastID: this.lastID}); }));
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));

const PROJ_B3X = 13;

const newSegments = [
  {
    start: '2026-05-04 11:00:00', minutes: 51, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: b3x-client-registry Phase 1-4 (mark 8 churned + add 3 new churned, build API+admin UI, GitHub remote + snapshot push, registry-PH linkage schema/API/UI, backfill matcher, triage cutover), sortable columns on triage dashboard, zoom-diff bucketization, batch-add unmatched PH projects.',
  },
  {
    start: '2026-05-04 12:00:00', minutes: 210, project: PROJ_B3X,
    desc: 'B3X — lipo-360 orchestration: registry source-of-truth investigation + 3-phase architecture design (canonical store, HTTP API, admin UI), Phase 1 dual-DB update script, Apache route deployment on hassan, Phase 3 nav + consumer cutover spec, GitHub remote setup, hassan zoom-deploy diff review, registry-PH linkage design (schema, scoring algo, rename-on-link convention), Phase 4A/B/C dispatches + response reviews + matcher refinement, git audit across 9 repos + 6 commits + pushes, batch-add-unmatched dispatch.',
  },
];

async function main() {
  console.log(COMMIT ? 'COMMIT MODE\n' : 'DRY RUN\n');

  // Idempotency
  const existing = await all(`
    SELECT id, start_time, duration_minutes, project_id_final
    FROM segments
    WHERE source_id LIKE 'may4-%' OR DATE(start_time) = '2026-05-04'
  `);
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing May 4 segments:`);
    existing.forEach(e => console.log(`  seg ${e.id} | ${e.start_time} | ${e.duration_minutes}m | proj=${e.project_id_final}`));
    console.log('\nRefusing to double-insert. Delete existing first if re-running.');
    db.close();
    return;
  }

  let baseSrc = Date.now();
  for (let i = 0; i < newSegments.length; i++) {
    const s = newSegments[i];
    const startDt = new Date(s.start.replace(' ', 'T') + 'Z');
    const endDt = new Date(startDt.getTime() + s.minutes * 60 * 1000);
    const startStr = startDt.toISOString().replace('T', ' ').substring(0, 19);
    const endStr   = endDt.toISOString().replace('T', ' ').substring(0, 19);
    const sourceId = `may4-${baseSrc + i}`;

    console.log(`  ${startStr} | ${s.minutes}m → B3X (AC#${s.project})`);
    console.log(`    src_id: ${sourceId}`);
    console.log(`    desc:   ${s.desc.slice(0, 120)}...`);

    if (COMMIT) {
      const r = await run(`
        INSERT INTO segments (
          source_id, start_time, end_time, duration_minutes, cwd,
          task_description, task_context, project_id_final,
          confidence_score, approval_status, status, submitted_to_ac,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, 'approved', 'approved', 0,
                  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        sourceId, startStr, endStr, s.minutes,
        '/home/mp/awesome/super-agent',
        s.desc,
        JSON.stringify({ taskSummaries: [s.desc], source: 'may4-day-summary' }),
        s.project,
      ]);
      console.log(`    ✓ inserted as segment id=${r.lastID}\n`);
    } else {
      console.log('');
    }
  }

  if (COMMIT) {
    const summary = await all(`
      SELECT DATE(s.start_time) as date, p.activecollab_project_name as project,
             COUNT(*) as segs,
             ROUND(SUM(COALESCE(s.adjusted_duration_minutes, s.duration_minutes))/60.0, 2) as hours,
             SUM(CASE WHEN s.submitted_to_ac=1 THEN 1 ELSE 0 END) as submitted
      FROM segments s
      JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
      WHERE DATE(s.start_time) = '2026-05-04'
      GROUP BY DATE(s.start_time), p.activecollab_project_id
    `);
    console.log('\nMAY 4 SEGMENTS NOW IN DB:');
    summary.forEach(r => console.log(`  ${r.date} | ${r.project} | segs=${r.segs} | ${r.hours}h | submitted=${r.submitted}`));
  }

  db.close();
}
main().catch(e => { console.error('ERR:', e); db.close(); process.exit(1); });
