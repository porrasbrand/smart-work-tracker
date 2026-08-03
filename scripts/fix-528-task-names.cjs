// Consolidate raw-prompt-titled Omaha (AC 528) July tasks into client-facing tasks.
// Records are billable_status 1 (unlocked). Create clean task -> recreate each time
// record under it with a client-facing summary -> delete old record -> delete old
// junk task -> update segments DB.
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const config = require('../config.js');
const sqlite3 = require('sqlite3');

const AC = config.activeCollab.apiUrl;
const HDRS = { 'X-Angie-AuthApiToken': config.activeCollab.apiToken, 'Content-Type': 'application/json' };
const PID = 528;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const db = new sqlite3.Database('data/smart-work-tracker.db');
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

async function api(method, url, body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(AC + url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (r.ok) { try { return JSON.parse(text); } catch { return text; } }
    if ((r.status === 403 || r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep((i + 1) * 10000); continue; }
    throw new Error(`${method} ${url} -> ${r.status}: ${text.slice(0, 120)}`);
  }
}

// segId, date, hours, oldTask, oldRec, new client-facing summary
const GROUPS = [
  {
    taskName: 'Omaha — Google Ads optimization: competitor negative keywords + change verification (st)',
    recs: [
      { seg: 2374, date: '2026-07-24', hours: '1.00', oldTask: 150405, oldRec: 124386, summary: 'Applied competitor negative keywords across campaigns; coordinated pending decisions with Stephanie' },
      { seg: 2373, date: '2026-07-24', hours: '0.50', oldTask: 150398, oldRec: 124379, summary: 'Verified all requested ad-account changes were applied correctly in the Omaha Marketing account' },
      { seg: 2372, date: '2026-07-24', hours: '0.50', oldTask: 150384, oldRec: 124365, summary: 'Google Ads account maintenance and lead-pipeline checks' },
    ],
  },
  {
    taskName: 'Omaha — Meta Ads: Spanish-audience campaign adjustment + ad copy compliance review (st)',
    recs: [
      { seg: 2051, date: '2026-07-07', hours: '0.50', oldTask: 150020, oldRec: 124001, summary: 'Reviewed office request and adjusted the Spanish-audience Meta ad campaign' },
      { seg: 2052, date: '2026-07-09', hours: '0.50', oldTask: 150027, oldRec: 124008, summary: 'Compliance review of every active ad — checked copy for errors and overclaims before scaling' },
    ],
  },
  {
    taskName: 'Omaha — July campaign performance monitoring + office coordination (st)',
    recs: [
      { seg: 1930, date: '2026-07-06', hours: '0.50', oldTask: 149929, oldRec: 123910, summary: 'Marketing session setup and ad-platform connection checks' },
      { seg: 2212, date: '2026-07-16', hours: '0.50', oldTask: 150244, oldRec: 124225, summary: 'Performance review of the new July ad campaigns' },
      { seg: 2213, date: '2026-07-17', hours: '0.50', oldTask: 150251, oldRec: 124232, summary: 'Automated July campaign monitoring run — verified pacing and alert thresholds' },
      { seg: 2369, date: '2026-07-22', hours: '0.50', oldTask: 150286, oldRec: 124267, summary: 'Marketing and lead-pipeline maintenance (Dr. Soto)' },
      { seg: 2370, date: '2026-07-22', hours: '0.50', oldTask: 150307, oldRec: 124288, summary: 'Marketing and lead-pipeline maintenance (Dr. Soto)' },
      { seg: 2371, date: '2026-07-23', hours: '0.50', oldTask: 150335, oldRec: 124316, summary: 'Reviewed latest Omaha office correspondence and handled follow-ups' },
    ],
  },
];

(async () => {
  const oldTasks = [];
  for (const g of GROUPS) {
    const t = await api('POST', `/api/v1/projects/${PID}/tasks`, { name: g.taskName, assignee_id: config.activeCollab.userId });
    const taskId = t.single.id;
    console.log('created task', taskId, '|', g.taskName);
    await sleep(1500);
    for (const r of g.recs) {
      const rec = await api('POST', `/api/v1/projects/${PID}/time-records`, {
        value: r.hours, record_date: r.date, job_type_id: config.activeCollab.jobTypeId,
        user_id: config.activeCollab.userId, billable_status: 1, summary: r.summary, task_id: taskId,
      });
      await api('DELETE', `/api/v1/projects/${PID}/time-records/${r.oldRec}`);
      await run(`UPDATE segments SET ac_task_id=?, ac_time_record_id=?,
                 review_notes=COALESCE(review_notes,'')||' [renamed to client-facing task 2026-08-03]' WHERE id=?`,
        [taskId, rec.single.id, r.seg]);
      oldTasks.push(r.oldTask);
      console.log(`  ${r.date} ${r.hours}h seg ${r.seg} -> rec ${rec.single.id} (old ${r.oldRec} deleted)`);
      await sleep(1500);
    }
  }
  console.log('deleting old junk tasks:', oldTasks.join(', '));
  for (const tid of oldTasks) {
    try { await api('DELETE', `/api/v1/projects/${PID}/tasks/${tid}`); console.log('  deleted', tid); }
    catch (e) { console.log('  FAILED', tid, e.message); }
    await sleep(1000);
  }
  db.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
