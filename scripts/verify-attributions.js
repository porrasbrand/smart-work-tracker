#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function verify() {
  const db = new Database(config.database.path);
  await db.connect();

  // Get attributed segments
  const segments = await db.all(`
    SELECT
      s.id,
      s.start_time,
      s.duration_minutes,
      s.files_touched,
      s.commands_run,
      s.confidence_score,
      p.activecollab_project_id,
      p.activecollab_project_name,
      p.keywords
    FROM segments s
    JOIN projects_map p ON s.project_id_detected = p.id
    ORDER BY s.start_time DESC
  `);

  console.log('\n=== Attribution Verification ===\n');

  for (const seg of segments) {
    const date = new Date(seg.start_time).toLocaleString();
    const hours = Math.floor(seg.duration_minutes / 60);
    const mins = seg.duration_minutes % 60;

    console.log(`Segment ${seg.id} [${date}] - ${hours}h ${mins}m`);
    console.log(`Project: ${seg.activecollab_project_name} (AC ID: ${seg.activecollab_project_id})`);
    console.log(`Confidence: ${seg.confidence_score?.toFixed(2)}`);

    const keywords = JSON.parse(seg.keywords || '[]');
    console.log(`Keywords: [${keywords.join(', ')}]`);

    const files = JSON.parse(seg.files_touched || '[]');
    const commands = JSON.parse(seg.commands_run || '[]');

    // Find which keywords matched
    const matchedInFiles = [];
    const matchedInCommands = [];

    keywords.forEach(keyword => {
      const filesText = files.join(' ').toLowerCase();
      const commandsText = commands.join(' ').toLowerCase();

      if (filesText.includes(keyword.toLowerCase())) {
        matchedInFiles.push(keyword);
      }
      if (commandsText.includes(keyword.toLowerCase())) {
        matchedInCommands.push(keyword);
      }
    });

    if (matchedInFiles.length > 0) {
      console.log(`✓ Matched in files: ${matchedInFiles.join(', ')}`);
      // Show examples
      const examples = files.filter(f =>
        keywords.some(k => f.toLowerCase().includes(k.toLowerCase()))
      ).slice(0, 2);
      examples.forEach(ex => console.log(`  - ${ex}`));
    }

    if (matchedInCommands.length > 0) {
      console.log(`✓ Matched in commands: ${matchedInCommands.join(', ')}`);
      // Show examples
      const examples = commands.filter(c =>
        keywords.some(k => c.toLowerCase().includes(k.toLowerCase()))
      ).slice(0, 2);
      examples.forEach(ex => console.log(`  - ${ex.substring(0, 100)}...`));
    }

    console.log('');
  }

  await db.close();
}

verify().catch(console.error);
