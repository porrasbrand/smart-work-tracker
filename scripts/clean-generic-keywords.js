#!/usr/bin/env node

const Database = require('../src/lib/database');
const config = require('../config');

async function cleanKeywords() {
  const db = new Database(config.database.path);
  await db.connect();

  // Get all projects
  const projects = await db.all('SELECT id, activecollab_project_id, activecollab_project_name, keywords FROM projects_map');

  // Generic words to filter out
  const genericWords = ['com', 'net', 'org', 'old', 'new', 'the', 'and', 'for', 'www'];

  console.log('\n=== Cleaning Generic Keywords ===\n');

  for (const project of projects) {
    const keywords = JSON.parse(project.keywords || '[]');
    const filteredKeywords = keywords.filter(k => {
      // Keep keywords that are:
      // 1. Not in generic list
      // 2. Longer than 3 characters (avoid 'com', 'net', etc.)
      return !genericWords.includes(k.toLowerCase()) && k.length > 3;
    });

    if (filteredKeywords.length !== keywords.length) {
      console.log(`${project.activecollab_project_name}:`);
      console.log(`  Before: [${keywords.join(', ')}]`);
      console.log(`  After:  [${filteredKeywords.join(', ')}]`);

      await db.run(`
        UPDATE projects_map
        SET keywords = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [JSON.stringify(filteredKeywords), project.id]);
    }
  }

  console.log('\n✓ Cleaned generic keywords from all projects');

  await db.close();
}

cleanKeywords().catch(console.error);
