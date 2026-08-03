// July Omaha (AC 528) — evidence-backed untracked hours, confirmed by Manuel
// 2026-08-03. 10.5h manual (Gmail/ads-platform evidence) + 1h pending tracker
// segments (2469, 2470) = 11.5h, bringing July to 24.0h total.
require('dotenv').config();
const config = require('../config.js');
const sqlite3 = require('sqlite3');

const AC = config.activeCollab.apiUrl;
const HDRS = { 'X-Angie-AuthApiToken': config.activeCollab.apiToken, 'Content-Type': 'application/json' };
const PID = 528;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const db = new sqlite3.Database(__dirname + '/../data/smart-work-tracker.db');
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

async function api(method, url, body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(AC + url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (r.ok) return JSON.parse(text);
    if ((r.status === 403 || r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep((i + 1) * 10000); continue; }
    throw new Error(`${method} ${url} -> ${r.status}: ${text.slice(0, 120)}`);
  }
}

const TASKS = [
  {
    name: 'Omaha — daily lead-report review & lead monitoring (July) (st)',
    recs: [
      { date: '2026-07-07', h: '1.00', s: 'Daily lead-report reviews and lead monitoring — week of Jul 1-7' },
      { date: '2026-07-14', h: '1.00', s: 'Daily lead-report reviews and lead monitoring — week of Jul 8-14' },
      { date: '2026-07-21', h: '1.25', s: 'Daily lead-report reviews and lead monitoring — week of Jul 15-21' },
      { date: '2026-07-28', h: '1.25', s: 'Daily lead-report reviews and lead monitoring — week of Jul 22-28' },
    ],
  },
  {
    name: 'Omaha — client correspondence & August campaign planning (st)',
    recs: [
      { date: '2026-07-22', h: '1.25', s: 'August campaign planning email to office — Neck & CoolSculpting performance review and recommendations' },
      { date: '2026-07-23', h: '0.75', s: 'PPC call-quality concern raised by Dr. Jennifer — call trend review and response plan' },
      { date: '2026-07-30', h: '0.50', s: 'Reviewed office Fall campaign recommendations and marketing notes' },
      { date: '2026-07-31', h: '0.50', s: 'July wrap-up — reviewed latest office messages, prepared August adjustments', seg: 2469 },
      { date: '2026-07-31', h: '0.50', s: 'July wrap-up — campaign review session continued', seg: 2470 },
    ],
  },
  {
    name: 'Omaha — Google Ads: competitor negative keyword sweep (in-platform) (st)',
    recs: [
      { date: '2026-07-23', h: '1.00', s: 'Tightened competitor-name negatives across all search campaigns (in-platform work)' },
    ],
  },
  {
    name: 'Omaha — Meta Ads management: July Neck $1000 + CoolSculpting Summer (in-platform) (st)',
    recs: [
      { date: '2026-07-08', h: '1.00', s: 'Meta campaign management — ad rotation and budget checks (July Neck $1000, CoolSculpting Summer)' },
      { date: '2026-07-18', h: '1.00', s: 'Meta campaign management — creative performance review and adjustments' },
    ],
  },
  {
    name: 'Omaha — GBP review response + site-health triage (st)',
    recs: [
      { date: '2026-07-22', h: '0.50', s: 'Responded to Google Business Profile review; triaged Ahrefs site-audit alerts (broken images)' },
    ],
  },
];

(async () => {
  let total = 0;
  for (const t of TASKS) {
    const task = await api('POST', `/api/v1/projects/${PID}/tasks`, { name: t.name, assignee_id: config.activeCollab.userId });
    const taskId = task.single.id;
    console.log('task', taskId, '|', t.name);
    await sleep(1500);
    for (const r of t.recs) {
      const rec = await api('POST', `/api/v1/projects/${PID}/time-records`, {
        value: r.h, record_date: r.date, job_type_id: config.activeCollab.jobTypeId,
        user_id: config.activeCollab.userId, billable_status: 1, summary: r.s, task_id: taskId,
      });
      total += Number(r.h);
      if (r.seg) {
        await run(`UPDATE segments SET project_id_final=?, approval_status='approved', submitted_to_ac=1,
                   ac_task_id=?, ac_time_record_id=?, submitted_at=datetime('now'),
                   review_notes=COALESCE(review_notes,'')||' [submitted with Jul evidence-reconstruction batch 2026-08-03]'
                   WHERE id=?`, [PID, taskId, rec.single.id, r.seg]);
      }
      console.log(`  ${r.date} ${r.h}h rec ${rec.single.id}${r.seg ? ' (seg ' + r.seg + ')' : ''}`);
      await sleep(1500);
    }
  }
  db.close();
  console.log('DONE — logged', total.toFixed(1) + 'h');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
