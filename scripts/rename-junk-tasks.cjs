// Rename raw-prompt / credential-leaking task names in AC projects 675 + 13 to
// client-facing names, IN PLACE (rename only — never touches time records, so it
// is safe for invoice-locked records). DRY_RUN=1 prints old -> new only.
require('dotenv').config();
const config = require('../config.js');
const { TaskNamer, sanitizeText, looksLikeRawPrompt } = require('../src/lib/task-namer');
const fs = require('fs');

const AC = config.activeCollab.apiUrl;
const HDRS = { 'X-Angie-AuthApiToken': config.activeCollab.apiToken, 'Content-Type': 'application/json' };
const DRY = process.env.DRY_RUN === '1';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const namer = new TaskNamer(console);

const PROJECTS = [
  { id: 675, name: 'Phoenix - TheLipedemaInstitute.com' },
  { id: 13, name: 'BreakThrough3x.com  - Dan Kuschel' },
];

const SECRET_RE = /(ctrk_\w+|xox[abposr]-[\w-]+|sk-[\w-]{20,}|password|passwort|\bcode=)/i;

function needsRename(name) {
  if (SECRET_RE.test(name)) return true;
  if (/<command-name>|<task-notification>|## Context Usage|https?:\/\//.test(name)) return true;
  if (/\n/.test(name)) return true;
  const stripped = name.replace(/\s*\(st\)\s*$/, '');
  return looksLikeRawPrompt(sanitizeText(stripped));
}

async function api(method, url, body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(AC + url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (r.ok) { try { return JSON.parse(text); } catch { return text; } }
    if ((r.status === 403 || r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep((i + 1) * 10000); continue; }
    throw new Error(`${method} ${url} -> ${r.status}: ${text.slice(0, 120)}`);
  }
}

// Hand-written names where the source is credentials or notification dumps the
// model can't (and shouldn't) name from content.
const OVERRIDES = {
  147969: 'Slack expert-channel workspace setup (1st Choice) (st)',
  148284: 'Echelon — WordPress application-password access setup (st)',
  148396: 'Background task monitoring — pipeline notifications review (st)',
  148403: 'Background task monitoring — pipeline notifications review (st)',
};

(async () => {
  const audit = [];
  for (const proj of PROJECTS) {
    const d = await api('GET', `/api/v1/projects/${proj.id}/tasks`);
    const tasks = (d.tasks || []).filter(t => needsRename(t.name));
    console.log(`\n=== project ${proj.id}: ${tasks.length} of ${(d.tasks || []).length} open tasks need renaming`);
    for (const t of tasks) {
      const hadSuffix = /\(st\)\s*$/.test(t.name);
      const created = new Date((t.created_on || 0) * 1000).toISOString().slice(0, 10);
      let newName = OVERRIDES[t.id];
      if (!newName) {
        const newBase = await namer.clientFacingName({
          activecollab_project_name: proj.name,
          start_time: created,
          task_description: t.name.replace(/\s*\(st\)\s*$/, ''),
        });
        newName = hadSuffix ? `${newBase} (st)` : newBase;
      }
      console.log(`  ${t.id}: "${t.name.replace(/\s+/g, ' ').slice(0, 60)}"`);
      console.log(`      -> "${newName}"`);
      audit.push({ project: proj.id, task: t.id, old: t.name, new: newName });
      if (!DRY) {
        await api('PUT', `/api/v1/projects/${proj.id}/tasks/${t.id}`, { name: newName });
        await sleep(1200);
      }
    }
  }
  fs.writeFileSync(__dirname + '/rename-junk-tasks.audit.json', JSON.stringify(audit, null, 2));
  console.log(`\n${DRY ? 'DRY RUN' : 'DONE'} — ${audit.length} renames, audit log: scripts/rename-junk-tasks.audit.json`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
