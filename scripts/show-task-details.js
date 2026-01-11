#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function showTaskDetails() {
  const taskDir = '/home/mp/awesome/super-agent/tasks/responses/archive';

  // Project keywords to search for
  const projects = [
    { name: 'Empower Solar/Homes', keywords: ['empower'] },
    { name: 'Gshomeservices', keywords: ['gshomeservices'] },
    { name: 'echelonelectricnj.com', keywords: ['echelon'] },
    { name: 'plumbing-connection.com', keywords: ['plumbing'] },
    { name: 'BreakThrough3x.com', keywords: ['breakthrough3x'] },
    { name: 'Phoenix & Infiniskin / Dr. Hall', keywords: ['phoenix', 'infiniskin'] },
    { name: 'pearcehvac.com', keywords: ['pearcehvac'] },
    { name: 'Phoenixweightloss.com', keywords: ['phoenixweightloss'] }
  ];

  const taskFiles = fs.readdirSync(taskDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(taskDir, f));

  console.log('\n=== TASK DETAILS BY PROJECT (Last 2 Days) ===\n');

  for (const project of projects) {
    console.log('='.repeat(80));
    console.log(`PROJECT: ${project.name}`);
    console.log('='.repeat(80));

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
            task: content.task || '',
            response: content.response || '',
            matches
          });
        }
      } catch (err) {
        // Skip malformed files
      }
    }

    if (projectTasks.length === 0) {
      console.log('No tasks found.\n');
      continue;
    }

    // Sort by timestamp
    projectTasks.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`\nFound ${projectTasks.length} task(s):\n`);

    projectTasks.forEach((task, idx) => {
      console.log(`\n[${ idx + 1}] ${task.date}`);
      console.log(`Matched keywords: ${task.matches.join(', ')}`);
      console.log('\nTASK:');
      console.log(task.task.substring(0, 500));
      if (task.task.length > 500) console.log('...(truncated)');

      console.log('\nRESPONSE:');
      console.log(task.response.substring(0, 300));
      if (task.response.length > 300) console.log('...(truncated)');
      console.log('-'.repeat(80));
    });

    console.log('\n');
  }
}

showTaskDetails().catch(console.error);
