#!/usr/bin/env node
// Submit staged September 2026 hours to ActiveCollab.
// Dry-run by default: prints the full plan. Pass --live to actually create tasks + time records.
// Protocol: task first, then time-record WITH task_id (parent is only settable at create).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const STAGED = require('./september-2026-missing.json');
const BASE = 'https://app.activecollab.com/180377/api/v1';
const TOKEN = process.env.AC_API_TOKEN;
const LIVE = process.argv.includes('--live');

async function ac(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'X-Angie-AuthApiToken': TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

(async () => {
  let totalHours = 0, totalRecords = 0, failures = 0;
  const results = [];
  for (const task of STAGED.tasks) {
    const taskHours = task.records.reduce((s, r) => s + r.hours, 0);
    totalHours += taskHours;
    totalRecords += task.records.length;
    console.log(`\n[${task.project_id}] ${task.task_name}  (${taskHours}h, ${task.records.length} records)`);
    for (const r of task.records) console.log(`   ${r.date}  ${String(r.hours).padStart(4)}h  ${r.summary}`);

    if (!LIVE) continue;
    try {
      const t = await ac('POST', `/projects/${task.project_id}/tasks`, { name: task.task_name, assignee_id: 1 });
      const taskId = t.single.id;
      for (const r of task.records) {
        try {
          const rec = await ac('POST', `/projects/${task.project_id}/time-records`, {
            value: String(r.hours),
            record_date: r.date,
            job_type_id: 1,
            user_id: 1,
            billable_status: 1,
            summary: r.summary,
            task_id: taskId,
          });
          results.push({ project: task.project_id, task_id: taskId, record_id: rec.single.id, date: r.date, hours: r.hours });
        } catch (e) {
          failures++;
          console.error(`   FAILED record ${r.date} ${r.hours}h: ${e.message}`);
        }
      }
      console.log(`   -> task ${taskId} created, records linked`);
    } catch (e) {
      failures++;
      console.error(`   FAILED task create: ${e.message}`);
    }
  }
  console.log(`\n=== TOTAL: ${totalHours}h across ${totalRecords} records in ${STAGED.tasks.length} tasks ===`);
  if (!LIVE) console.log('DRY RUN — nothing submitted. Re-run with --live to create tasks + time records in ActiveCollab.');
  else {
    require('fs').writeFileSync(__dirname + '/september-2026-submitted-part2.json', JSON.stringify(results, null, 2));
    console.log(`LIVE run done. ${results.length} records created, ${failures} failures. Audit: scripts/september-2026-submitted-part2.json`);
  }
})();
