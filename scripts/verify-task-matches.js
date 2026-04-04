#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function verifyMatches() {
  const taskDir = '/home/mp/awesome/super-agent/tasks/responses/archive';

  // Project keywords to search for
  const projects = [
    { name: 'Empower Solar/Homes', keywords: ['empower'], acId: 570 },
    { name: 'Gshomeservices', keywords: ['gshomeservices'], acId: 507 },
    { name: 'echelonelectricnj.com', keywords: ['echelon'], acId: 493 },
    { name: 'plumbing-connection.com', keywords: ['plumbing'], acId: 451 },
    { name: 'BreakThrough3x.com', keywords: ['breakthrough3x'], acId: 13 },
    { name: 'Phoenix & Infiniskin / Dr. Hall', keywords: ['phoenix', 'infiniskin'], acId: 1 },
    { name: 'pearcehvac.com', keywords: ['pearcehvac'], acId: 521 },
    { name: 'Phoenixweightloss.com', keywords: ['phoenixweightloss'], acId: 352 }
  ];

  const taskFiles = fs.readdirSync(taskDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(taskDir, f));

  console.log('\n=== VERIFY TASK MATCHES (Last 2 Days) ===\n');
  console.log('Review each match to determine if it\'s REAL client work or a FALSE POSITIVE\n');

  for (const project of projects) {
    const projectTasks = [];

    for (const taskFile of taskFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
        const timestamp = parseInt(path.basename(taskFile, '.json'));
        const date = new Date(timestamp);

        // Skip if too old
        if (date < new Date('2026-01-09')) continue;

        const taskText = [content.task || '', content.response || ''].join(' ').toLowerCase();

        // Check if any keyword matches
        const matches = project.keywords.filter(keyword => taskText.includes(keyword.toLowerCase()));

        if (matches.length > 0) {
          projectTasks.push({
            timestamp,
            date: date.toLocaleString(),
            taskSummary: (content.task || '').substring(0, 200).replace(/\n/g, ' '),
            fullTask: content.task || '',
            matches
          });
        }
      } catch (err) {
        // Skip malformed files
      }
    }

    if (projectTasks.length === 0) continue;

    // Sort by timestamp
    projectTasks.sort((a, b) => b.timestamp - a.timestamp);

    console.log('━'.repeat(80));
    console.log(`${project.name} (AC ID: ${project.acId})`);
    console.log(`Total matches: ${projectTasks.length}`);
    console.log('━'.repeat(80));

    projectTasks.forEach((task, idx) => {
      console.log(`\n[${idx + 1}] ${task.date}`);
      console.log(`    Keywords: ${task.matches.join(', ')}`);
      console.log(`    Summary: ${task.taskSummary}...`);

      // Determine if likely false positive based on context
      const taskLower = task.fullTask.toLowerCase();
      const isFalsePositive = (
        // Generic references
        (project.keywords.includes('plumbing') && taskLower.includes('plumbing') && !taskLower.includes('plumbing-connection.com')) ||
        (project.keywords.includes('electric') && taskLower.includes('electric') && !taskLower.includes('echelon')) ||
        (project.keywords.includes('phoenix') && taskLower.includes('phoenix') && !taskLower.includes('infiniskin') && !taskLower.includes('weight'))
      );

      if (isFalsePositive) {
        console.log('    ⚠️  LIKELY FALSE POSITIVE (generic keyword in unrelated context)');
      } else {
        console.log('    ✓  LIKELY REAL CLIENT WORK');
      }
    });

    console.log('\n');
  }

  console.log('\n=== SUMMARY ===\n');
  console.log('Review the matches above and identify:');
  console.log('1. Which projects have REAL client work?');
  console.log('2. Which matches are FALSE POSITIVES?');
  console.log('3. Should we filter out certain generic keywords from task matching?');
}

verifyMatches().catch(console.error);
