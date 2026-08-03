// Continuation of fix-jul31-ai-hall-misroute.cjs after mid-stream 403.
// Already done: Omaha task 151805 (segs 1894,1899,1895,1896,1897,1898), Phoenix task
// 151812 (segs 1892,1893), Phoenix task 151819 + seg 2082. Remaining below.
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const config = require('../config.js');
const sqlite3 = require('sqlite3');

const AC = config.activeCollab.apiUrl;
const HDRS = { 'X-Angie-AuthApiToken': config.activeCollab.apiToken, 'Content-Type': 'application/json' };
const USER_ID = config.activeCollab.userId;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const db = new sqlite3.Database('data/smart-work-tracker.db');
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

async function api(method, url, body, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(AC + url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (r.ok) { try { return JSON.parse(text); } catch { return text; } }
    if ((r.status === 403 || r.status === 429 || r.status >= 500) && i < tries - 1) {
      console.log(`   ${method} ${url} -> ${r.status}, retrying in ${(i + 1) * 15}s`);
      await sleep((i + 1) * 15000);
      continue;
    }
    throw new Error(`${method} ${url} -> ${r.status}: ${text.slice(0, 150)}`);
  }
}

// [segId, toProject, taskId or null, taskName if create]
const REMAINING = [
  { toProject: 1, taskId: 151819, taskName: null, segments: [2083, 2084, 2085] },
  { toProject: 1, taskId: null, taskName: 'Phoenix — CallRail API v3 + lead timestamp verification (st)', segments: [2367, 2368] },
  { toProject: 13, taskId: null, taskName: 'Infra — worker connectivity diagnostics (hetzner/wsl2) (st)', segments: [2086] },
];
const OLD_PROJECT = 675;
const OLD_TASKS = [149810, 149831, 149880, 149894, 149908, 149915, 149922, 149887, 150048, 150601, 150055, 150062, 150076, 150468, 150475];

(async () => {
  for (const move of REMAINING) {
    let taskId = move.taskId;
    if (!taskId) {
      const t = await api('POST', `/api/v1/projects/${move.toProject}/tasks`, { name: move.taskName, assignee_id: USER_ID });
      taskId = t.single.id;
      console.log('created task', taskId, 'in project', move.toProject);
      await sleep(2000);
    }
    const rows = await all(`SELECT id, start_time, COALESCE(adjusted_duration_minutes,duration_minutes) mins,
      ac_task_id, ac_time_record_id, task_description FROM segments WHERE id IN (${move.segments.join(',')})`);
    const OVERRIDE = { 2083: 'Phoenix — Google Ads OAuth re-authorization (redirect code handling)' };
    for (const s of rows) {
      const date = s.start_time.slice(0, 10);
      const hours = (s.mins / 60).toFixed(2);
      const summary = OVERRIDE[s.id] || (s.task_description || '').replace(/\s+/g, ' ')
        .replace(/ctrk_\w+/gi, '[redacted]').replace(/https?:\/\/\S+/g, '[url]').slice(0, 120);
      const rec = await api('POST', `/api/v1/projects/${move.toProject}/time-records`, {
        value: hours, record_date: date, job_type_id: config.activeCollab.jobTypeId, user_id: USER_ID,
        billable_status: 1, summary, task_id: taskId,
      });
      await api('DELETE', `/api/v1/projects/${OLD_PROJECT}/time-records/${s.ac_time_record_id}`);
      await run(`UPDATE segments SET project_id_final=?, ac_task_id=?, ac_time_record_id=?,
                 review_notes=COALESCE(review_notes,'')||' [moved from AC 675 on 2026-08-03: misrouted by ai-hall cwd rule]'
                 WHERE id=?`, [move.toProject, taskId, rec.single.id, s.id]);
      console.log(`seg ${s.id} ${date} ${hours}h -> project ${move.toProject} task ${taskId} rec ${rec.single.id} (old rec ${s.ac_time_record_id} deleted)`);
      await sleep(2000);
    }
  }

  console.log('\nDeleting old junk tasks in 675...');
  for (const tid of OLD_TASKS) {
    try { await api('DELETE', `/api/v1/projects/${OLD_PROJECT}/tasks/${tid}`); console.log('  deleted task', tid); }
    catch (e) { console.log('  FAILED task', tid, e.message); }
    await sleep(1500);
  }

  const [row44] = await all(`SELECT id, cwd_patterns FROM projects_map WHERE activecollab_project_id=675`);
  const patterns = JSON.parse(row44.cwd_patterns).filter(p => !p.includes('sessions/ai-hall'));
  await run(`UPDATE projects_map SET cwd_patterns=?, updated_at=datetime('now') WHERE id=?`, [JSON.stringify(patterns), row44.id]);
  console.log('projects_map 675 cwd_patterns ->', JSON.stringify(patterns));

  db.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
