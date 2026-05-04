/**
 * Stage all segments for Apr 21-30 logging:
 *   - Update 7 existing unattributed segments with project_id_final + approval_status='approved'
 *   - Insert 5 new synthetic segments for hetzner-only work (Apr 27/28/29 + Apr 30 hetzner portion)
 * Then run TimeSubmitter in DRY RUN to show what would be submitted.
 *
 * Use --commit to persist changes.
 * Use --submit to actually submit to ActiveCollab (otherwise dry-run only).
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

process.chdir('/home/mp/awesome/smart-work-tracker');

const COMMIT = process.argv.includes('--commit');
const SUBMIT = process.argv.includes('--submit');

const DB_PATH = '/home/mp/awesome/smart-work-tracker/data/smart-work-tracker.db';
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(e){ e ? rej(e) : res({changes: this.changes, lastID: this.lastID}); }));
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));
const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, row) => e ? rej(e) : res(row)));

// AC project IDs
const PROJ_B3X = 13;        // B3X Internal (formerly "BreakThrough3x.com - Dan Kuschel")
const PROJ_INTELEMARK = 12; // Intelemark

const segmentUpdates = [
  { id: 596, project: PROJ_INTELEMARK, desc: "Intelemark — discussion: review email-enrichment progress and harvested-emails count to date" },
  { id: 597, project: PROJ_B3X,         desc: "B3X — investigate hassan dashboard data feed at breakthrough3x.com/apps/reports/v1.2-client-dashboard.html" },
  { id: 600, project: PROJ_B3X,         desc: "B3X — backend planning for b3x-command-center + b3x-client-registry on hetzner" },
  { id: 601, project: PROJ_INTELEMARK,  desc: "Intelemark — admin: smart-work-tracker time-logging coordination" },
  { id: 602, project: PROJ_B3X,         desc: "B3X — ProofHub triage dashboard: AI re-analyze loop investigation + scroll-loss surgical row-removal fix (commit 8bac5a7)" },
  { id: 603, project: PROJ_INTELEMARK,  desc: "Intelemark — Apollo cascade enrichment: lazy-title-match analysis, person_seniorities switch, backfill test design + interpretation" },
  { id: 604, project: PROJ_INTELEMARK,  desc: "Intelemark — cascade dispatch monitoring + stage-1 pre-flight review" },
];

// New synthetic segments for hetzner-only work
// Each represents the SUM of hetzner wall-time for that project on that day.
// start_time set to a sensible mid-workday time per day.
const newSegments = [
  {
    start: '2026-04-27 14:00:00', minutes: 67, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: b3x-command-center CLAUDE.md, b3x-internal-meetings phases 00+02, ProofHub API write probes, start_date backfill on 78 + 38 tasks',
  },
  {
    start: '2026-04-28 12:00:00', minutes: 90, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: ProofHub Triage Dashboard full deployment (Express :3878 + SPA), 16+ feature commits, AI completion analysis with Gemini+OpenAI consults, workflow investigation, close-task API verification',
  },
  {
    start: '2026-04-29 11:00:00', minutes: 46, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: 3-dashboard unified navigation, centralized Google OAuth, allowlist patches, Jacob→Richard rename, ProofHub @-mention probes (5 rounds), AI Follow-Up V2 with mprofile mentions, @-mention picker UI',
  },
  {
    start: '2026-04-30 14:00:00', minutes: 44, project: PROJ_B3X,
    desc: 'B3X — hetzner orchestration: ProofHub triage dashboard scroll-loss surgical fix implementation (commit 8bac5a7) + Gemini consult on AI re-analyze loop',
  },
  {
    start: '2026-04-30 14:00:00', minutes: 39, project: PROJ_INTELEMARK,
    desc: 'Intelemark — hetzner orchestration: Apollo cascade enrichment v1+v2 spec consults (Gemini), Apollo backfill test (200 No-Data accounts), cascade implementation pre-flight + option B/Y patches',
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(COMMIT ? '  STAGE & COMMIT MODE' : '  DRY RUN MODE — no DB changes');
  console.log('═══════════════════════════════════════════════════════════\n');

  // STEP 1 — Update existing segments
  console.log('STEP 1 — Update 7 existing unattributed segments\n');
  for (const u of segmentUpdates) {
    const cur = await get('SELECT id, start_time, duration_minutes, project_id_final, approval_status, submitted_to_ac FROM segments WHERE id = ?', [u.id]);
    if (!cur) { console.log(`  ⚠ Segment ${u.id} NOT FOUND — skipping`); continue; }
    if (cur.submitted_to_ac === 1) { console.log(`  ⊘ Segment ${u.id} already submitted — skipping`); continue; }
    const projName = u.project === PROJ_B3X ? 'B3X' : 'Intelemark';
    console.log(`  Segment ${u.id} | ${cur.start_time} | ${cur.duration_minutes}m → ${projName} (AC#${u.project})`);
    console.log(`    desc: ${u.desc.slice(0, 90)}...`);
    if (COMMIT) {
      await run(
        `UPDATE segments
         SET project_id_final = ?,
             task_description = ?,
             approval_status  = 'approved',
             status           = 'approved',
             updated_at       = datetime('now')
         WHERE id = ?`,
        [u.project, u.desc, u.id]
      );
    }
  }

  // STEP 2 — Create new synthetic segments
  console.log('\nSTEP 2 — Create 5 new synthetic segments for hetzner-only work\n');
  const maxSrc = await get('SELECT MAX(source_id) as max FROM segments');
  let nextSrc = (maxSrc.max || 0) + 1;

  for (const s of newSegments) {
    const projName = s.project === PROJ_B3X ? 'B3X' : 'Intelemark';
    const startDt = new Date(s.start);
    const endDt = new Date(startDt.getTime() + s.minutes * 60 * 1000);
    const startStr = s.start;
    const endStr = endDt.toISOString().replace('T', ' ').substring(0, 19);
    console.log(`  ${startStr} | ${s.minutes}m → ${projName} (AC#${s.project})`);
    console.log(`    desc: ${s.desc.slice(0, 90)}...`);
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
        nextSrc++,
        startStr,
        endStr,
        s.minutes,
        '/home/mp/awesome/super-agent',
        s.desc,
        JSON.stringify({ taskSummaries: [s.desc], source: 'hetzner-orchestration-relay' }),
        s.project,
      ]);
      console.log(`    ✓ inserted as segment id=${r.lastID}`);
    }
  }

  // STEP 3 — Summarize what's now ready to submit
  console.log('\nSTEP 3 — Summarize ready-to-submit segments\n');
  const ready = await all(`
    SELECT DATE(s.start_time) as date, p.activecollab_project_name as project, p.activecollab_project_id as ac_id,
           COUNT(*) as segs,
           ROUND(SUM(COALESCE(s.adjusted_duration_minutes, s.duration_minutes))/60.0, 2) as hours
    FROM segments s
    JOIN projects_map p ON s.project_id_final = p.activecollab_project_id
    WHERE s.submitted_to_ac = 0
      AND s.approval_status = 'approved'
      AND DATE(s.start_time) >= '2026-04-21'
    GROUP BY DATE(s.start_time), p.activecollab_project_id
    ORDER BY date, p.activecollab_project_name
  `);
  console.log('  Date       | Project                              | AC# | Segs | Hours');
  console.log('  -----------|--------------------------------------|-----|------|------');
  let total = 0;
  ready.forEach(r => {
    console.log(`  ${r.date} | ${(r.project || '').padEnd(36)} | ${String(r.ac_id).padStart(3)} | ${String(r.segs).padStart(4)} | ${String(r.hours+'h').padStart(5)}`);
    total += r.hours;
  });
  console.log(`  ──────────────────────────────────────────────────────────────────`);
  console.log(`  GRAND TOTAL: ${total.toFixed(2)}h ready to submit`);

  if (!COMMIT) {
    console.log('\n→ DRY RUN complete. Re-run with --commit to apply DB changes.');
    db.close();
    return;
  }
  console.log('\n→ DB changes committed.');

  // STEP 4 — Optionally submit to ActiveCollab
  if (!SUBMIT) {
    console.log('\n→ NOT submitting to ActiveCollab. Re-run with --commit --submit to push to AC.');
    db.close();
    return;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  STEP 4 — Submitting to ActiveCollab via TimeSubmitter');
  console.log('═══════════════════════════════════════════════════════════\n');

  const TimeSubmitter = require('../src/lib/time-submitter');
  const { Database } = require('../src/lib/database');
  const winston = require('winston');
  const config = require('../config');

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
    transports: [new winston.transports.Console()],
  });

  const swdb = new Database(DB_PATH, logger);
  await swdb.connect();

  const submitter = new TimeSubmitter(swdb, logger, config);
  const result = await submitter.submitTimeRecords({
    startDate: '2026-04-21 00:00:00',
    endDate:   '2026-04-30 23:59:59',
  });

  console.log('\n  Submission result:');
  console.log('    submitted: ' + result.submitted);
  console.log('    failed:    ' + result.failed);
  console.log('    skipped:   ' + result.skipped);
  console.log('    totalHours:' + result.totalHours);

  await swdb.close();
  db.close();
}

main().catch(e => { console.error('ERR:', e); db.close(); process.exit(1); });
