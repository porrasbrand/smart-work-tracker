/**
 * Check this week's unbilled work with project attribution
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/smart-work-tracker.db');

// Get detailed segments with files touched
db.all(`
  SELECT
    id,
    DATE(start_time) as date,
    ROUND(COALESCE(adjusted_duration_minutes, duration_minutes)/60.0, 2) as hours,
    cwd,
    task_description,
    files_touched,
    submitted_to_ac,
    project_id_final
  FROM segments
  WHERE DATE(start_time) >= date('now', '-4 days')
    AND (submitted_to_ac IS NULL OR submitted_to_ac = 0)
  ORDER BY start_time DESC
`, (e, rows) => {
  if (e) { console.error('Error:', e); process.exit(1); }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 UNBILLED WORK THIS WEEK - BY PROJECT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let projectWork = {};

  rows.forEach(r => {
    // Parse files touched to determine actual project
    let files = [];
    try { files = JSON.parse(r.files_touched || '[]'); } catch(e) {}

    // Determine project from files or cwd
    let project = 'Unknown';
    let acProjectId = null;
    const fileStr = files.join(' ').toLowerCase();
    const taskStr = (r.task_description || '').toLowerCase();

    if (fileStr.includes('gbp-audit') || fileStr.includes('empower') || taskStr.includes('empower') || taskStr.includes('gbp')) {
      project = 'Empower Home Services';
      acProjectId = 570;
    } else if (fileStr.includes('photos-analyzer') || taskStr.includes('photos-analyzer')) {
      project = 'Internal: photos-analyzer';
    } else if (fileStr.includes('smart-work-tracker') || taskStr.includes('smart-work')) {
      project = 'Internal: smart-work-tracker';
    } else if (fileStr.includes('client-score-card') || taskStr.includes('scorecard')) {
      project = 'Internal: client-score-card';
    } else if (fileStr.includes('super-agent') || taskStr.includes('hetzner') || taskStr.includes('wsl2')) {
      project = 'Internal: super-agent';
    } else if (r.cwd) {
      project = 'Other: ' + r.cwd.replace('/home/mp/awesome/', '').split('/')[0];
    }

    if (!projectWork[project]) {
      projectWork[project] = { hours: 0, segments: [], acProjectId };
    }
    projectWork[project].hours += r.hours;
    projectWork[project].segments.push({
      id: r.id,
      date: r.date,
      hours: r.hours,
      task: (r.task_description || 'No description').substring(0, 60)
    });
  });

  // Display by project
  let billableHours = 0;
  let internalHours = 0;

  Object.entries(projectWork)
    .sort((a,b) => b[1].hours - a[1].hours)
    .forEach(([proj, data]) => {
      const isBillable = data.acProjectId != null;
      const icon = isBillable ? '💰' : '🔧';

      if (isBillable) billableHours += data.hours;
      else internalHours += data.hours;

      console.log(`\n${icon} ${proj}: ${data.hours.toFixed(2)}h ${isBillable ? '(BILLABLE - AC#' + data.acProjectId + ')' : '(internal)'}`);
      console.log('─'.repeat(60));
      data.segments.forEach(s => {
        console.log(`   [${s.id}] ${s.date} | ${s.hours}h | ${s.task}`);
      });
    });

  const total = Object.values(projectWork).reduce((sum, p) => sum + p.hours, 0);

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n  💰 BILLABLE (needs logging):  ${billableHours.toFixed(2)} hours`);
  console.log(`  🔧 Internal work:             ${internalHours.toFixed(2)} hours`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📋 TOTAL UNBILLED:            ${total.toFixed(2)} hours\n`);

  db.close();
});
