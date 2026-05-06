/**
 * Log May 5 hours: 1 lipo-360 orchestration segment, all B3X Internal (AC#13).
 *
 * Session anchor:
 *   First commit on hetzner: 13:02 UTC (b0d401f → 2f2190f → ... → a1fc419)
 *   Last commit on hetzner: 17:33 UTC
 *   13 commits total, all in zoom-action-items
 *   Plus pre-first-commit UX work (mockups + spec + consult) starting ~12:22 UTC
 *   Plus ongoing v2 prompt iteration dispatch + smart-work-tracker logging
 *
 * Total active orchestration: ~5h15m = 315 minutes
 *
 * What we shipped today (all B3X internal):
 *   - Zoom dashboard left-panel UX redesign (Alt E: client-as-primary-navigation)
 *     spec → consult-openai → mockups @/dev/mockups-zoom/ → ship → verify
 *   - Header compaction (Option 2: 143px → 65px)
 *   - 2 hotfixes (week-trigger desync, unpush 500/missing column)
 *   - Active/churned client distinction (registry integration via ph_project_id match)
 *   - @mention fix in auto-comment (real phmention, not plain text)
 *   - Edit-logger pipeline (snapshot at push + capture-edits endpoint + cron + dedup)
 *   - Phil edits analysis (last 30 pushes classified structural vs tonal)
 *   - Path X title-styler (Gemini → OpenAI swap → Gemini billing test → A/B replay)
 *   - Strategic SOP framing consult with OpenAI
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
    start: '2026-05-05 12:22:00', minutes: 315, project: PROJ_B3X,
    desc: 'B3X — Zoom dashboard deep work: (a) left-panel UX redesign Alt E (client-as-primary-nav) — spec, OpenAI consult, mockups deployed at /dev/mockups-zoom/, shipped + verified; (b) header compaction Option 2 (~80px reclaim); (c) 2 hotfixes (week-trigger desync, unpush 500 missing column); (d) active/churned client distinction via registry integration (ph_project_id-first match strategy, 22/37 zoom clients enriched with status); (e) @mention fix in auto-comment (real PH phmention markup); (f) edit-logger pipeline (snapshot-at-push + /admin/capture-edits + cron + dedup + opener-heuristic port to live classifier); (g) Phil edits analysis (last 30 pushes classified structural vs tonal, expanded opener heuristic); (h) Path X title-styler experiment (Gemini → OpenAI swap → Gemini billing test → A/B replay → v2 prompt iteration in flight); (i) strategic Phil-SOP framing consult with OpenAI (codify-as-SOP vs adapt-vs-standardize question).',
  },
];

async function main() {
  console.log(COMMIT ? 'COMMIT MODE\n' : 'DRY RUN\n');

  // Idempotency
  const existing = await all(`
    SELECT id, start_time, duration_minutes, project_id_final
    FROM segments
    WHERE source_id LIKE 'may5-%' OR DATE(start_time) = '2026-05-05'
  `);
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing May 5 segments:`);
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
    const sourceId = `may5-${baseSrc + i}`;

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
        JSON.stringify({ taskSummaries: [s.desc], source: 'may5-day-summary' }),
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
      WHERE DATE(s.start_time) = '2026-05-05'
      GROUP BY DATE(s.start_time), p.activecollab_project_id
    `);
    console.log('\nMAY 5 SEGMENTS NOW IN DB:');
    summary.forEach(r => console.log(`  ${r.date} | ${r.project} | segs=${r.segs} | ${r.hours}h | submitted=${r.submitted}`));
  }

  db.close();
}
main().catch(e => { console.error('ERR:', e); db.close(); process.exit(1); });
