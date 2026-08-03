// Fix the Jul-31 submission batch: sessions/ai-hall segments were blanket-routed to
// AC 675 (Phoenix - TheLipedemaInstitute.com) by projects_map row 44's cwd_pattern.
// AC can't re-parent time records (PUT ignores task_id), so: create labeled task in
// the correct project -> create time record with task_id -> delete old record ->
// delete old junk task -> update segments table. DRY_RUN=1 prints the plan only.
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const config = require('../config.js');
const sqlite3 = require('sqlite3');

const AC = config.activeCollab.apiUrl;
const HDRS = { 'X-Angie-AuthApiToken': config.activeCollab.apiToken, 'Content-Type': 'application/json' };
const USER_ID = config.activeCollab.userId;
const JOB_TYPE = config.activeCollab.jobTypeId;
const DRY = process.env.DRY_RUN === '1';

// segment id -> { rec: old time-record id, task: old task id, date, hours, summary }
// filled from DB; the grouping below is the routing decision.
const MOVES = [
  { toProject: 528, taskName: 'Omaha — July campaign build: Neck_July_Promo ad group + Meta/Coolsculpting planning (st)',
    segments: [1894, 1899, 1895, 1896, 1897, 1898] },
  { toProject: 1, taskName: 'Phoenix — site chat review + WP user access (Shannon) (st)',
    segments: [1892, 1893] },
  { toProject: 1, taskName: 'Phoenix — Google Ads access fix + performance report (st)',
    segments: [2082, 2083, 2084, 2085] },
  { toProject: 1, taskName: 'Phoenix — CallRail API v3 + lead timestamp verification (st)',
    segments: [2367, 2368] },
  { toProject: 13, taskName: 'Infra — worker connectivity diagnostics (hetzner/wsl2) (st)',
    segments: [2086] },
];
const OLD_PROJECT = 675;

const db = new sqlite3.Database('data/smart-work-tracker.db');
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

async function api(method, url, body) {
  const r = await fetch(AC + url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

(async () => {
  const ids = MOVES.flatMap(m => m.segments);
  const rows = await all(
    `SELECT id, start_time, COALESCE(adjusted_duration_minutes, duration_minutes) mins,
            ac_task_id, ac_time_record_id, task_description
     FROM segments WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  for (const id of ids) if (!byId[id]) throw new Error(`segment ${id} not found`);

  // Safety: no other segments may reference the tasks we plan to delete.
  const oldTaskIds = [...new Set(rows.map(r => r.ac_task_id))];
  const otherRefs = await all(
    `SELECT id, ac_task_id FROM segments
     WHERE ac_task_id IN (${oldTaskIds.map(() => '?').join(',')})
       AND id NOT IN (${ids.map(() => '?').join(',')})`, [...oldTaskIds, ...ids]);
  if (otherRefs.length) throw new Error('other segments still reference old tasks: ' + JSON.stringify(otherRefs));

  console.log((DRY ? 'DRY RUN' : 'EXECUTING') + ' — ' + rows.length + ' segments, ' + oldTaskIds.length + ' old tasks in project ' + OLD_PROJECT);

  for (const move of MOVES) {
    const segs = move.segments.map(id => byId[id]);
    const totalH = segs.reduce((a, s) => a + s.mins, 0) / 60;
    console.log(`\n-> project ${move.toProject}: "${move.taskName}" (${segs.length} records, ${totalH}h)`);
    let newTaskId = null;
    if (!DRY) {
      const t = await api('POST', `/api/v1/projects/${move.toProject}/tasks`, { name: move.taskName, assignee_id: USER_ID });
      newTaskId = t.single.id;
      console.log('   created task', newTaskId);
    }
    for (const s of segs) {
      const date = s.start_time.slice(0, 10);
      const hours = (s.mins / 60).toFixed(2);
      const summary = (s.task_description || '').replace(/\s+/g, ' ').replace(/ctrk_\w+/gi, '[redacted]').slice(0, 120);
      console.log(`   seg ${s.id} ${date} ${hours}h  (old task ${s.ac_task_id}, old rec ${s.ac_time_record_id})`);
      if (DRY) continue;
      const rec = await api('POST', `/api/v1/projects/${move.toProject}/time-records`, {
        value: hours, record_date: date, job_type_id: JOB_TYPE, user_id: USER_ID,
        billable_status: 1, summary, task_id: newTaskId,
      });
      const newRecId = rec.single.id;
      await api('DELETE', `/api/v1/projects/${OLD_PROJECT}/time-records/${s.ac_time_record_id}`);
      await run(`UPDATE segments SET project_id_final=?, ac_task_id=?, ac_time_record_id=?,
                 review_notes=COALESCE(review_notes,'')||' [moved from AC 675 on 2026-08-03: misrouted by ai-hall cwd rule]'
                 WHERE id=?`, [move.toProject, newTaskId, newRecId, s.id]);
      console.log(`     -> new rec ${newRecId} under task ${newTaskId}, old rec deleted`);
    }
  }

  // Delete the now-empty junk tasks in 675 (incl. the API-key-leaking title 150468).
  console.log('\nDeleting old tasks in ' + OLD_PROJECT + ':', oldTaskIds.join(', '));
  if (!DRY) {
    for (const tid of oldTaskIds) {
      try { await api('DELETE', `/api/v1/projects/${OLD_PROJECT}/tasks/${tid}`); console.log('   deleted task', tid); }
      catch (e) { console.log('   FAILED to delete task', tid, e.message); }
    }
  }

  // Root cause: drop the sessions/ai-hall blanket cwd_pattern from the TLI map row
  // so ai-hall work routes by content keywords (omaha->528, phoenix->1, tli->675).
  const [row44] = await all(`SELECT id, cwd_patterns FROM projects_map WHERE activecollab_project_id=675`);
  const patterns = JSON.parse(row44.cwd_patterns).filter(p => !p.includes('sessions/ai-hall'));
  console.log('\nprojects_map 675 cwd_patterns ->', JSON.stringify(patterns));
  if (!DRY) await run(`UPDATE projects_map SET cwd_patterns=?, updated_at=datetime('now') WHERE id=?`, [JSON.stringify(patterns), row44.id]);

  db.close();
  console.log('\n' + (DRY ? 'DRY RUN COMPLETE — run without DRY_RUN=1 to execute' : 'DONE'));
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
