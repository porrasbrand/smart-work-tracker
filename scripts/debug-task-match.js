#!/usr/bin/env node

const fs = require('fs');

// Read the task
const taskData = JSON.parse(fs.readFileSync('/home/mp/awesome/super-agent/tasks/responses/archive/1768048732152.json', 'utf8'));
const taskText = `${taskData.task} ${taskData.response}`.toLowerCase();

// Check for specific keywords
const keywords = ['phoenixweightloss', 'phoenix', 'hall', 'infiniskin'];

console.log('=== Task Keyword Analysis ===\n');
console.log('Task ID: 1768048732152\n');

for (const keyword of keywords) {
  const count = (taskText.match(new RegExp(keyword, 'gi')) || []).length;
  console.log(`"${keyword}": ${count} matches`);

  if (count > 0) {
    // Find context around the match
    const index = taskText.indexOf(keyword);
    const start = Math.max(0, index - 50);
    const end = Math.min(taskText.length, index + keyword.length + 50);
    console.log(`  Context: ...${taskText.substring(start, end)}...`);
  }
}

console.log('\n=== Task Summary ===');
console.log(taskData.task.substring(0, 200));
