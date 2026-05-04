/**
 * Insert 5 synthetic segments for hetzner-only orchestration time.
 * STEP 1 (existing-segment updates) already completed and auto-submitted by the
 * smart-work-tracker-api watcher. This script handles STEP 2 only.
 *
 * Auto-submission will pick these up automatically once approval_status='approved'.
 * Run with --commit to actually insert.
 */
const sqlite3 = require('sqlite3').verbose();
process.chdir('/home/mp/awesome/smart-work-tracker');

const COMMIT = process.argv.includes('--commit');
const DB_PATH = '/home/mp/awesome/smart-work-tracker/data/smart-work-tracker.db';
const db = new sqlite3.Database(DB_PATH);
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(e){ e ? rej(e) : res({changes: this.changes, lastID: this.lastID}); }));
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));

const PROJ_B3X = 13;
const PROJ_INTELEMARK = 12;

const newSegments = [
  { start: '2026-04-27 14:00:00', minutes: 67, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: b3x-command-center CLAUDE.md, b3x-internal-meetings phases 00+02, ProofHub API write probes, start_date backfill on 78 + 38 tasks' },
  { start: '2026-04-28 12:00:00', minutes: 90, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: ProofHub Triage Dashboard full deployment (Express :3878 + SPA), 16+ feature commits, AI completion analysis with Gemini+OpenAI consults, workflow investigation, close-task API verification' },
  { start: '2026-04-29 11:00:00', minutes: 46, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: 3-dashboard unified navigation, centralized Google OAuth, allowlist patches, Jacob→Richard rename, ProofHub @-mention probes (5 rounds), AI Follow-Up V2 with mprofile mentions, @-mention picker UI' },
  { start: '2026-04-30 14:00:00', minutes: 44, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: ProofHub triage dashboard scroll-loss surgical fix implementation (commit 8bac5a7) + Gemini consult on AI re-analyze loop' },
  { start: '2026-04-30 14:00:00', minutes: 39, project: PROJ_INTELEMARK,
    desc: 'Intelemark — hetzner orchestration: Apollo cascade enrichment v1+v2 spec consults (Gemini), Apollo backfill test (200 No-Data accounts), cascade implementation pre-flight + option B/Y patches' },
];

async function main() {
  console.log(COMMIT ? 'COMMIT MODE\n' : 'DRY RUN\n');

  // Idempotency: don't insert duplicates if rerun
  const existing = await all(`
    SELECT id, start_time, duration_minutes, project_id_final, task_description
    FROM segments
    WHERE source_id LIKE 'hetzner-orchestration-%'
       OR (task_description LIKE 'B3X — hetzner orchestration%' OR task_description LIKE 'Intelemark — hetzner orchestration%')
  `);
  if (existing.length > 0) {
    console.log(`⚠ Found ${existing.length} existing hetzner-orchestration segments — refusing to double-insert:`);
    existing.forEach(e => console.log(`    seg ${e.id} | ${e.start_time} | ${e.duration_minutes}m | proj=${e.project_id_final}`));
    console.log('\nIf you need to retry, delete these first.');
    db.close();
    return;
  }

  let baseSrc = Date.now();
  for (let i = 0; i < newSegments.length; i++) {
    const s = newSegments[i];
    const projName = s.project === PROJ_B3X ? 'B3X' : 'Intelemark';
    const startDt = new Date(s.start.replace(' ', 'T') + 'Z'); // treat as UTC for unambiguous storage
    const endDt = new Date(startDt.getTime() + s.minutes * 60 * 1000);
    const startStr = startDt.toISOString().replace('T', ' ').substring(0, 19);
    const endStr   = endDt.toISOString().replace('T', ' ').substring(0, 19);
    const sourceId = `hetzner-orchestration-${baseSrc + i}`;

    console.log(`  ${startStr} | ${s.minutes}m → ${projName} (AC#${s.project})`);
    console.log(`    src_id: ${sourceId}`);
    console.log(`    desc:   ${s.desc.slice(0, 100)}...`);

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
        JSON.stringify({ taskSummaries: [s.desc], source: 'hetzner-orchestration-relay' }),
        s.project,
      ]);
      console.log(`    ✓ inserted as segment id=${r.lastID}\n`);
    } else {
      console.log('');
    }
  }

  // Summary
  const summary = await all(`
    SELECT DATE(s.start_time) as date, p.activecollab_project_name as project, p.activecollab_project_id as ac_id,
           COUNT(*) as segs,
           ROUND(SUM(COALESCE(s.adjusted_duration_minutes, s.duration_minutes))/60.0, 2) as hours
    FROM segments s
    JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
    WHERE DATE(s.start_time) >= '2026-04-21'
    GROUP BY DATE(s.start_time), p.activecollab_project_id
    ORDER BY date, p.activecollab_project_name
  `);

  console.log('\nALL SEGMENTS (Apr 21-30) by day & project:');
  console.log('  Date       | Project                              | AC# | Segs | Hours');
  console.log('  -----------|--------------------------------------|-----|------|------');
  let total = 0;
  summary.forEach(r => {
    console.log(`  ${r.date} | ${(r.project || '').padEnd(36)} | ${String(r.ac_id).padStart(3)} | ${String(r.segs).padStart(4)} | ${String(r.hours+'h').padStart(5)}`);
    total += r.hours;
  });
  console.log(`  ──────────────────────────────────────────────────────────────────`);
  console.log(`  GRAND TOTAL: ${total.toFixed(2)}h`);

  db.close();
}

main().catch(e => { console.error('ERR:', e); db.close(); process.exit(1); });
