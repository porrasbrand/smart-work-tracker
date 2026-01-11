#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('../src/lib/database');
const config = require('../config');

async function analyzeTaskLogs() {
  const db = new Database(config.database.path);
  await db.connect();

  // Get all ActiveCollab projects with keywords
  const projects = await db.all('SELECT id, activecollab_project_id, activecollab_project_name, keywords FROM projects_map');

  console.log('\n=== Analyzing Super-Agent Task Logs for Client Work ===\n');

  // Prepare keyword map
  const projectKeywordMap = {};
  projects.forEach(p => {
    const keywords = JSON.parse(p.keywords || '[]');
    projectKeywordMap[p.id] = {
      name: p.activecollab_project_name,
      acId: p.activecollab_project_id,
      keywords: keywords.map(k => k.toLowerCase())
    };
  });

  // Read task response files from super-agent directory
  const taskDir = path.join('/home/mp/awesome/super-agent/tasks/responses/archive');
  let taskFiles = [];

  try {
    taskFiles = fs.readdirSync(taskDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(taskDir, f));
  } catch (err) {
    console.error('Error reading task directory:', err.message);
    await db.close();
    return;
  }

  console.log(`Found ${taskFiles.length} task response files\n`);

  // Analyze each task file
  const projectMentions = {};
  const tasksByProject = {};

  for (const taskFile of taskFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
      const taskText = [content.task || '', content.response || ''].join(' ').toLowerCase();
      const timestamp = parseInt(path.basename(taskFile, '.json'));
      const date = new Date(timestamp);

      // Skip if too old (before Jan 9, 2026)
      if (date < new Date('2026-01-09')) continue;

      // Check which projects are mentioned
      for (const [projectId, projectInfo] of Object.entries(projectKeywordMap)) {
        const matches = projectInfo.keywords.filter(keyword =>
          keyword.length > 3 && taskText.includes(keyword)
        );

        if (matches.length > 0) {
          if (!projectMentions[projectId]) {
            projectMentions[projectId] = {
              ...projectInfo,
              count: 0,
              tasks: []
            };
          }

          projectMentions[projectId].count++;
          projectMentions[projectId].tasks.push({
            file: path.basename(taskFile),
            timestamp: timestamp,
            date: date.toLocaleString(),
            matches: matches,
            taskPreview: (content.task || '').substring(0, 150)
          });
        }
      }
    } catch (err) {
      // Skip malformed files
    }
  }

  // Sort by mention count
  const sortedProjects = Object.entries(projectMentions)
    .sort((a, b) => b[1].count - a[1].count);

  if (sortedProjects.length === 0) {
    console.log('No client project mentions found in recent task logs (after Jan 9)');
  } else {
    console.log('=== Client Projects Mentioned in Task Logs (Last 2 Days) ===\n');

    sortedProjects.forEach(([projectId, info]) => {
      console.log(`${info.name} (AC ID: ${info.acId})`);
      console.log(`  Mentions: ${info.count} task(s)`);
      console.log(`  Keywords matched: [${info.keywords.join(', ')}]`);
      console.log('  Recent tasks:');

      info.tasks.slice(0, 3).forEach(task => {
        console.log(`    - ${task.date}`);
        console.log(`      Matched: ${task.matches.join(', ')}`);
        console.log(`      Task: ${task.taskPreview}...`);
      });

      if (info.tasks.length > 3) {
        console.log(`    ... and ${info.tasks.length - 3} more`);
      }
      console.log('');
    });

    // Recommendations
    console.log('\n=== Recommendations ===\n');
    console.log('The task logs contain rich client work context. Consider:');
    console.log('1. Adding task log analysis to attribution engine (Phase 2B)');
    console.log('2. Extracting task descriptions from remote responses');
    console.log('3. Using remote task timestamps for more accurate time tracking');
    console.log('4. Creating a "task context" field in segments table');
  }

  await db.close();
}

analyzeTaskLogs().catch(console.error);
